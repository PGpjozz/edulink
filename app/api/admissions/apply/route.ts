import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { schoolId, firstName, lastName, email, grade, notes, website } = body;

        // Honeypot — bots fill hidden fields
        if (website) {
            return NextResponse.json({ ok: true });
        }

        if (!schoolId || !firstName || !lastName || !email || !grade) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        if (!EMAIL_RE.test(email)) {
            return new NextResponse('Invalid email address', { status: 400 });
        }

        const school = await prisma.school.findFirst({
            where: { id: schoolId, isActive: true },
            select: { id: true }
        });

        if (!school) {
            return new NextResponse('School not found or not accepting applications', { status: 404 });
        }

        const application = await prisma.application.create({
            data: {
                schoolId,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim().toLowerCase(),
                grade: String(grade),
                notes: notes?.trim() || null,
                status: 'PENDING'
            }
        });

        return NextResponse.json({ ok: true, id: application.id });
    } catch (error) {
        console.error(error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
