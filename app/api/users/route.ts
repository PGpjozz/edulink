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
        const body = await readJson<any>(req);
        if (body instanceof NextResponse) return body;
        const { firstName, lastName, email, role, idNumber, password: rawPassword, grade, learnerProfileId } = body;

        if (!firstName || !lastName || !role) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const allowedRoles = ['TEACHER', 'LEARNER', 'SCHOOL_ADMIN', 'PRINCIPAL', 'PARENT'];
        if (!allowedRoles.includes(role)) {
            return new NextResponse('Invalid role', { status: 400 });
        }

        if (role !== 'LEARNER' && !email) {
            return new NextResponse('Email is required', { status: 400 });
        }

        if (role === 'LEARNER' && !idNumber) {
            return new NextResponse('idNumber is required for learners', { status: 400 });
        }

        if (role === 'LEARNER' && !grade) {
            return new NextResponse('grade is required for learners', { status: 400 });
        }

        // Validate learnerProfileId for PARENT linking
        let linkedLearnerProfile: { id: string } | null = null;
        if (role === 'PARENT' && learnerProfileId) {
            linkedLearnerProfile = await prisma.learnerProfile.findFirst({
                where: { id: learnerProfileId, user: { schoolId: auth.schoolId as string } },
                select: { id: true }
            });
            if (!linkedLearnerProfile) {
                return new NextResponse('Invalid learner profile ID', { status: 400 });
            }
        }

        const hashedPassword = await bcrypt.hash(rawPassword || 'password123', 10);

        const user = await prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                idNumber,
                password: hashedPassword,
                role: role as any,
                schoolId: auth.schoolId as string,
                isActive: true,
                ...(role === 'LEARNER' && {
                    learnerProfile: { create: { grade: grade as string } }
                }),
                ...(role === 'TEACHER' && {
                    teacherProfile: { create: {} }
                }),
                ...(role === 'PARENT' && {
                    parentProfile: { create: { learnerIds: linkedLearnerProfile ? [linkedLearnerProfile.id] : [] } }
                }),
            }
        });

        // Bidirectional link: also add parent User ID to LearnerProfile.parentIds
        if (role === 'PARENT' && linkedLearnerProfile) {
            const existing = await prisma.learnerProfile.findUnique({
                where: { id: linkedLearnerProfile.id },
                select: { parentIds: true }
            });
            if (existing && !existing.parentIds.includes(user.id)) {
                await prisma.learnerProfile.update({
                    where: { id: linkedLearnerProfile.id },
                    data: { parentIds: { push: user.id } }
                });
            }
        }

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'CREATE_USER',
            entity: 'USER',
            entityId: user.id,
            details: { createdRole: role, email: user.email, idNumber: user.idNumber, grade }
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
