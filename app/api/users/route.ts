import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';
import bcrypt from 'bcryptjs';
import { validateSaId, normalizeSaId } from '@/lib/sa-id';
import { validatePassword, generateTemporaryPassword } from '@/lib/password';
import { isProduction } from '@/lib/env';

// GET: Fetch users (Teachers, Learners, Admins)
export async function GET(req: Request) {
    const auth = await requireAuth({ schoolAdmin: true, requireSchoolId: true });
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
                permissions: true,
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
        const { firstName, lastName, email, role, idNumber, password: rawPassword, grade, learnerProfileId, departmentId, alsoTeaches } = body;

        if (!firstName || !lastName || !role) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const allowedRoles = ['TEACHER', 'LEARNER', 'SCHOOL_ADMIN', 'PRINCIPAL', 'PARENT', 'HOD'];
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

        if (role === 'LEARNER') {
            const idCheck = validateSaId(idNumber);
            if (!idCheck.valid) {
                return new NextResponse(idCheck.error || 'Invalid SA ID number', { status: 400 });
            }

            const normalizedId = normalizeSaId(idNumber);
            const existingLearner = await prisma.user.findFirst({
                where: { idNumber: normalizedId },
                select: { id: true, schoolId: true }
            });
            if (existingLearner) {
                return new NextResponse('A user with this ID number already exists', { status: 409 });
            }
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

        let plainPassword = rawPassword?.trim();
        let usesDefaultPassword = false;

        if (!plainPassword) {
            if (isProduction()) {
                return new NextResponse('Password is required when creating users in production', { status: 400 });
            }
            plainPassword = generateTemporaryPassword();
            usesDefaultPassword = true;
        } else {
            const passwordError = validatePassword(plainPassword);
            if (passwordError) {
                return new NextResponse(passwordError, { status: 400 });
            }
        }

        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        const needsTeacherProfile =
            role === 'TEACHER' ||
            role === 'HOD' ||
            (alsoTeaches && ['PRINCIPAL', 'SCHOOL_ADMIN'].includes(role));

        const user = await prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                idNumber: role === 'LEARNER' ? normalizeSaId(idNumber) : idNumber,
                password: hashedPassword,
                role: role as any,
                schoolId: auth.schoolId as string,
                isActive: true,
                mustChangePassword: usesDefaultPassword || role === 'LEARNER',
                ...(role === 'LEARNER' && {
                    learnerProfile: { create: { grade: grade as string } }
                }),
                ...(needsTeacherProfile && {
                    teacherProfile: {
                        create: {
                            departmentId: departmentId || undefined,
                        },
                    },
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
            role: user.role,
            ...(usesDefaultPassword && !isProduction() ? { temporaryPassword: plainPassword } : {}),
        });
    } catch (error) {
        console.error('Error creating user:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
