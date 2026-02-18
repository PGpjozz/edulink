import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';
import bcrypt from 'bcryptjs';

export async function GET(req: Request) {
    const auth = await requireAuth({ roles: ['PRINCIPAL', 'SCHOOL_ADMIN'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const applications = await prisma.application.findMany({
            where: { schoolId: auth.schoolId as string },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(applications);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const auth = await requireAuth({ roles: ['PRINCIPAL', 'SCHOOL_ADMIN'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{ id?: string; status?: string }>(req);
        if (body instanceof NextResponse) return body;
        const { id, status } = body;

        if (!id || !status) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const allowedStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
        if (!allowedStatuses.includes(status)) {
            return new NextResponse('Invalid status', { status: 400 });
        }

        const application = await prisma.application.findUnique({
            where: { id },
            include: { school: true }
        });

        if (!application) return new NextResponse('Application not found', { status: 404 });

        if (application.schoolId !== (auth.schoolId as string)) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        // If approved, create the user and learner profile
        if (status === 'APPROVED' && application.status !== 'APPROVED') {
            const hashedPassword = await bcrypt.hash('password123', 10);
            const newUser = await prisma.user.create({
                data: {
                    schoolId: application.schoolId,
                    email: application.email,
                    firstName: application.firstName,
                    lastName: application.lastName,
                    role: 'LEARNER',
                    // Default password or invite flow - here we'll just create a dummy
                    password: hashedPassword,
                    isActive: true,
                    learnerProfile: {
                        create: {
                            grade: application.grade
                        }
                    }
                }
            });

            // Log the approval in audit logs
            await writeAuditLog({
                schoolId: application.schoolId,
                userId: auth.userId,
                action: 'APPROVE_APPLICATION',
                entity: 'APPLICATION',
                entityId: application.id,
                details: { learnerUserId: newUser.id, message: `Approved application for ${application.firstName} ${application.lastName}` }
            });
        }

        if (status === 'REJECTED' && application.status !== 'REJECTED') {
            await writeAuditLog({
                schoolId: application.schoolId,
                userId: auth.userId,
                action: 'REJECT_APPLICATION',
                entity: 'APPLICATION',
                entityId: application.id,
                details: { message: `Rejected application for ${application.firstName} ${application.lastName}` }
            });
        }

        const updated = await prisma.application.update({
            where: { id },
            data: { status }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error(error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
