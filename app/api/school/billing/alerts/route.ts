import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PRINCIPAL') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const today = new Date();

        // 1. Find all PENDING invoices that are passed their due date
        const overdueInvoices = await prisma.feeInvoice.findMany({
            where: {
                schoolId: session.user.schoolId as string,
                status: 'PENDING',
                dueDate: { lt: today }
            },
            include: {
                learner: {
                    select: {
                        user: { select: { id: true, firstName: true, lastName: true } }
                    }
                }
            }
        });

        // 2. In a real app, we'd also find the Parent associated with the learner
        // and send them a notification. For now, we'll notify the learner's user ID
        // (which might be the parent's ID in some configurations, or we'll just 
        // find a parent linked to this school/learner).

        const alertsSent = [];

        for (const invoice of overdueInvoices) {
            // Find the parent for this learner
            const parentProfile = await prisma.parentProfile.findFirst({
                where: {
                    learnerIds: { has: invoice.learnerId }
                }
            });

            if (parentProfile) {
                // Create a notification for the parent
                const notification = await prisma.notification.create({
                    data: {
                        userId: parentProfile.userId,
                        title: 'Overdue Payment Alert',
                        message: `The invoice "${invoice.title}" for ${invoice.learner.user.firstName} is overdue. Please settle this as soon as possible.`,
                        type: 'BILLING'
                    }
                });
                alertsSent.push(notification);
            }
        }

        // 3. Update invoice status to OVERDUE if it was PENDING
        if (overdueInvoices.length > 0) {
            await prisma.feeInvoice.updateMany({
                where: {
                    id: { in: overdueInvoices.map(i => i.id) }
                },
                data: { status: 'OVERDUE' }
            });
        }

        return NextResponse.json({
            success: true,
            count: overdueInvoices.length,
            alertsSent: alertsSent.length
        });
    } catch (error) {
        console.error('Error generating financial alerts:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
