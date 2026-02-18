import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';
import bcrypt from 'bcryptjs';

// GET: Fetch users (Teachers, Learners, Admins)
export async function GET(req: Request) {
    const auth = await requireAuth({ roles: ['PRINCIPAL', 'SCHOOL_ADMIN'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const users = await prisma.user.findMany({
            where: {
                schoolId: auth.schoolId as string,
                role: { not: 'PROVIDER' as any }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                idNumber: true,
                role: true,
                isActive: true,
                teacherProfile: { select: { id: true } }
            },
            orderBy: { role: 'asc' }
        });

        return NextResponse.json(
            users.map((u) => ({
                ...u,
                teacherProfileId: u.teacherProfile?.id || null
            }))
        );
    } catch (error) {
        console.error('Error fetching users:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

// POST: Create a new user (Invite)
export async function POST(req: Request) {
    const auth = await requireAuth({ roles: ['PRINCIPAL'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{ firstName?: string; lastName?: string; email?: string; role?: string; idNumber?: string }>(req);
        if (body instanceof NextResponse) return body;
        const { firstName, lastName, email, role, idNumber } = body;

        if (!firstName || !lastName || !role) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const allowedRoles = ['TEACHER', 'LEARNER', 'SCHOOL_ADMIN', 'PRINCIPAL'];
        if (!allowedRoles.includes(role)) {
            return new NextResponse('Invalid role', { status: 400 });
        }

        if (role !== 'LEARNER' && !email) {
            return new NextResponse('Email is required', { status: 400 });
        }

        if (role === 'LEARNER' && !idNumber) {
            return new NextResponse('idNumber is required for learners', { status: 400 });
        }

        const hashedPassword = await bcrypt.hash('password123', 10); // Default password

        const user = await prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                idNumber, // Optional for some roles, required for learner
                password: hashedPassword,
                role,
                schoolId: auth.schoolId as string,
                isActive: true,
                // Create profile based on role
                ...(role === 'LEARNER' && {
                    learnerProfile: { create: { grade: '8' } }
                }),
                ...(role === 'TEACHER' && {
                    teacherProfile: { create: {} }
                }),
                ...(role === 'PRINCIPAL' && {
                    // Principal logic if needed
                })
            }
        });

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'CREATE_USER',
            entity: 'USER',
            entityId: user.id,
            details: { createdRole: role, email: user.email, idNumber: user.idNumber }
        });

        return NextResponse.json({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role
        });
    } catch (error) {
        console.error('Error creating user:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
