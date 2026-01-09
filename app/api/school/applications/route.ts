import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'PRINCIPAL' && session.user.role !== 'SCHOOL_ADMIN')) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const applications = await prisma.application.findMany({
            where: { schoolId: session.user.schoolId || '' },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(applications);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'PRINCIPAL' && session.user.role !== 'SCHOOL_ADMIN')) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const { id, status } = body;

        const application = await prisma.application.findUnique({
            where: { id },
            include: { school: true }
        });

        if (!application) return new NextResponse('Application not found', { status: 404 });

        // If approved, create the user and learner profile
        if (status === 'APPROVED' && application.status !== 'APPROVED') {
            const newUser = await prisma.user.create({
                data: {
                    schoolId: application.schoolId,
                    email: application.email,
                    firstName: application.firstName,
                    lastName: application.lastName,
                    role: 'LEARNER',
                    // Default password or invite flow - here we'll just create a dummy
                    password: 'password123',
                    isActive: true,
                    learnerProfile: {
                        create: {
                            grade: application.grade
                        }
                    }
                }
            });

            // Log the approval in audit logs
            await prisma.auditLog.create({
                data: {
                    schoolId: application.schoolId,
                    userId: session.user.id,
                    action: 'APPROVE_APPLICATION',
                    details: `Approved application for ${application.firstName} ${application.lastName}`
                }
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
