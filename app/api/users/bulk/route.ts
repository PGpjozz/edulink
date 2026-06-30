import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth, writeAuditLog } from '@/lib/api-auth';
import { parseBody } from '@/lib/http';

const ROLES = ['TEACHER', 'HOD', 'LEARNER', 'PARENT', 'SCHOOL_ADMIN', 'STAFF'] as const;

const rowSchema = z.object({
    role: z.enum(ROLES),
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(200).optional().or(z.literal('')),
    idNumber: z.string().trim().max(60).optional().or(z.literal('')),
    grade: z.string().trim().max(20).optional().or(z.literal('')),
    gender: z.string().trim().max(20).optional().or(z.literal('')),
    employeeNumber: z.string().trim().max(60).optional().or(z.literal('')),
    staffTitle: z.string().trim().max(120).optional().or(z.literal('')),
    password: z.string().min(6).max(100).optional().or(z.literal('')),
});

const bulkSchema = z.object({
    rows: z.array(z.record(z.string(), z.unknown())).min(1).max(1000),
});

export async function POST(req: Request) {
    const auth = await requireAuth({ roles: ['PRINCIPAL', 'SCHOOL_OWNER', 'SCHOOL_ADMIN'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const body = await parseBody(req, bulkSchema);
    if (body instanceof NextResponse) return body;

    const results: Array<{ row: number; status: 'created' | 'error'; name?: string; error?: string }> = [];
    let created = 0;

    for (let i = 0; i < body.rows.length; i++) {
        const parsed = rowSchema.safeParse(body.rows[i]);
        if (!parsed.success) {
            results.push({ row: i + 1, status: 'error', error: parsed.error.issues[0]?.message || 'Invalid row' });
            continue;
        }
        const r = parsed.data;
        const name = `${r.firstName} ${r.lastName}`;

        // Role-specific requirements
        if (r.role === 'LEARNER') {
            if (!r.idNumber) { results.push({ row: i + 1, status: 'error', name, error: 'idNumber (admission no) required for learners' }); continue; }
            if (!r.grade) { results.push({ row: i + 1, status: 'error', name, error: 'grade required for learners' }); continue; }
        } else if (!r.email) {
            results.push({ row: i + 1, status: 'error', name, error: 'email required' });
            continue;
        }

        const usesDefault = !r.password;
        const hashed = await bcrypt.hash(r.password || 'changeme123', 10);
        const needsTeacherProfile = r.role === 'TEACHER' || r.role === 'HOD';

        try {
            await prisma.user.create({
                data: {
                    firstName: r.firstName,
                    lastName: r.lastName,
                    email: r.email || null,
                    idNumber: r.idNumber || null,
                    password: hashed,
                    role: r.role,
                    schoolId: auth.schoolId as string,
                    isActive: true,
                    mustChangePassword: usesDefault,
                    gender: r.gender || undefined,
                    employeeNumber: r.employeeNumber || undefined,
                    staffTitle: r.staffTitle || undefined,
                    ...(r.role === 'LEARNER' && { learnerProfile: { create: { grade: r.grade as string } } }),
                    ...(needsTeacherProfile && { teacherProfile: { create: {} } }),
                    ...(r.role === 'PARENT' && { parentProfile: { create: { learnerIds: [] } } }),
                },
            });
            created++;
            results.push({ row: i + 1, status: 'created', name });
        } catch (e) {
            let msg = 'Failed to create';
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                msg = `Duplicate ${(e.meta?.target as string[])?.join(', ') || 'email/idNumber'}`;
            }
            results.push({ row: i + 1, status: 'error', name, error: msg });
        }
    }

    await writeAuditLog({
        schoolId: auth.schoolId,
        userId: auth.userId,
        action: 'BULK_IMPORT_USERS',
        entity: 'USER',
        entityId: 'bulk',
        details: { attempted: body.rows.length, created },
    });

    return NextResponse.json({ created, total: body.rows.length, results });
}
