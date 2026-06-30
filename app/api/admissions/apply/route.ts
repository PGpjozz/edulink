import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { parseBody, serverError } from '@/lib/http';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

const applicationSchema = z.object({
    schoolId: z.string().min(1),
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(200),
    grade: z.string().trim().min(1).max(20),
    notes: z.string().trim().max(2000).optional(),
});

export async function POST(req: Request) {
    // Public endpoint: throttle to prevent spam/abuse.
    const ip = getClientIp(req);
    const limit = rateLimit(`admissions-apply:${ip}`, 10, 60 * 60 * 1000);
    if (!limit.ok) {
        return NextResponse.json(
            { error: 'Too many applications submitted. Please try again later.' },
            { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } }
        );
    }

    const body = await parseBody(req, applicationSchema);
    if (body instanceof NextResponse) return body;

    try {
        // Ensure the target school exists and is active before accepting.
        const school = await prisma.school.findFirst({
            where: { id: body.schoolId, isActive: true },
            select: { id: true },
        });
        if (!school) {
            return NextResponse.json({ error: 'School not found' }, { status: 404 });
        }

        const application = await prisma.application.create({
            data: {
                schoolId: body.schoolId,
                firstName: body.firstName,
                lastName: body.lastName,
                email: body.email,
                grade: body.grade,
                notes: body.notes ?? null,
                status: 'PENDING',
            },
        });

        return NextResponse.json(application);
    } catch (e) {
        return serverError('admissions-apply', e);
    }
}
