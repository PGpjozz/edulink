import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';
import { canManageAdmissions } from '@/lib/permissions';
import bcrypt from 'bcryptjs';
import { generateTemporaryPassword } from '@/lib/password';
import { validateSaId, normalizeSaId } from '@/lib/sa-id';
import { sendEmail } from '@/lib/email';
import { checkLearnerCapacity } from '@/lib/school-subscription';
import { BRAND } from '@/lib/branding';

export async function GET() {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    if (!canManageAdmissions(auth)) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    try {
        const applications = await prisma.application.findMany({
            where: { schoolId: auth.schoolId as string },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(applications);
    } catch {
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    if (!canManageAdmissions(auth)) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    try {
        const body = await readJson<{
            id?: string;
            status?: string;
            classId?: string;
            idNumber?: string;
        }>(req);
        if (body instanceof NextResponse) return body;
        const { id, status, classId, idNumber } = body;

        if (!id || !status) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const allowedStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
        if (!allowedStatuses.includes(status)) {
            return new NextResponse('Invalid status', { status: 400 });
        }

        const application = await prisma.application.findUnique({
            where: { id },
            include: { school: true },
        });

        if (!application) return new NextResponse('Application not found', { status: 404 });
        if (application.schoolId !== auth.schoolId) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        if (status === 'APPROVED' && application.status !== 'APPROVED') {
            const saId = normalizeSaId(idNumber ?? application.idNumber ?? '');
            if (!saId) {
                return new NextResponse('SA ID number required to approve application', { status: 400 });
            }
            const idCheck = validateSaId(saId);
            if (!idCheck.valid) {
                return new NextResponse(idCheck.error ?? 'Invalid SA ID', { status: 400 });
            }

            let targetClassId = classId;
            if (!targetClassId) {
                const cls = await prisma.class.findFirst({
                    where: { schoolId: application.schoolId, grade: application.grade },
                    orderBy: { name: 'asc' },
                });
                targetClassId = cls?.id;
            }

            const tempPassword = generateTemporaryPassword();
            const hashedPassword = await bcrypt.hash(tempPassword, 10);

            const existingId = await prisma.user.findFirst({ where: { idNumber: saId } });
            if (existingId) {
                return new NextResponse('A learner with this ID number already exists', { status: 409 });
            }

            const capacity = await checkLearnerCapacity(application.schoolId);
            if (!capacity.allowed) {
                return NextResponse.json({ error: capacity.message }, { status: 403 });
            }

            const newUser = await prisma.user.create({
                data: {
                    schoolId: application.schoolId,
                    email: application.email,
                    idNumber: saId,
                    firstName: application.firstName,
                    lastName: application.lastName,
                    role: 'LEARNER',
                    password: hashedPassword,
                    isActive: true,
                    mustChangePassword: true,
                    learnerProfile: {
                        create: {
                            grade: application.grade,
                            ...(targetClassId ? { classId: targetClassId } : {}),
                        },
                    },
                },
            });

            const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
            await sendEmail({
                to: application.email,
                subject: `Welcome to ${application.school.name}`,
                html: `
                    <p>Dear ${application.firstName},</p>
                    <p>Your application to <strong>${application.school.name}</strong> has been approved.</p>
                    <p>Sign in with your SA ID <strong>${saId}</strong> and temporary password <strong>${tempPassword}</strong>.</p>
                    <p><a href="${baseUrl}/auth/signin?school=${application.school.subdomain}">Sign in to ${BRAND.name}</a></p>
                    <p>You will be asked to change your password on first login.</p>
                `,
            });

            await writeAuditLog({
                schoolId: application.schoolId,
                userId: auth.userId,
                action: 'APPROVE_APPLICATION',
                entity: 'APPLICATION',
                entityId: application.id,
                details: { learnerUserId: newUser.id, classId: targetClassId },
            });
        }

        if (status === 'REJECTED' && application.status !== 'REJECTED') {
            await writeAuditLog({
                schoolId: application.schoolId,
                userId: auth.userId,
                action: 'REJECT_APPLICATION',
                entity: 'APPLICATION',
                entityId: application.id,
                details: { message: `Rejected application for ${application.firstName} ${application.lastName}` },
            });
        }

        const updated = await prisma.application.update({
            where: { id },
            data: {
                status: status as 'PENDING' | 'APPROVED' | 'REJECTED',
                ...(idNumber ? { idNumber: normalizeSaId(idNumber) } : {}),
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error(error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
