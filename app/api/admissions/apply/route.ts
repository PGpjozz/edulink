import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { normalizeSaId, validateSaId } from '@/lib/sa-id';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
    const ip = getClientIp(req);
    const limit = checkRateLimit(`admissions-apply:${ip}`, 10, 60 * 60 * 1000);
    if (!limit.allowed) {
        return new NextResponse('Too many applications. Try again later.', { status: 429 });
    }

    try {
        const body = await req.json();
        const { schoolId, subdomain, firstName, lastName, email, grade, notes, idNumber, website } = body;

        if (website) {
            return NextResponse.json({ ok: true });
        }

        if ((!schoolId && !subdomain) || !firstName || !lastName || !email || !grade) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        if (!EMAIL_RE.test(email)) {
            return new NextResponse('Invalid email address', { status: 400 });
        }

        if (idNumber) {
            const check = validateSaId(normalizeSaId(idNumber));
            if (!check.valid) {
                return new NextResponse(check.error ?? 'Invalid SA ID', { status: 400 });
            }
        }

        const school = await prisma.school.findFirst({
            where: schoolId
                ? { id: schoolId, isActive: true }
                : { subdomain: String(subdomain).toLowerCase(), isActive: true },
            select: { id: true, name: true },
        });

        if (!school) {
            return new NextResponse('School not found or not accepting applications', { status: 404 });
        }

        const application = await prisma.application.create({
            data: {
                schoolId: school.id,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim().toLowerCase(),
                grade: String(grade),
                idNumber: idNumber ? normalizeSaId(idNumber) : null,
                notes: notes?.trim() || null,
                status: 'PENDING',
            },
        });

        return NextResponse.json({ ok: true, id: application.id, schoolName: school.name });
    } catch (error) {
        console.error(error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
