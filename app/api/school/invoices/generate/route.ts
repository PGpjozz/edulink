import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, writeAuditLog } from '@/lib/api-auth';
import { canManageFinance } from '@/lib/permissions';
import { sendEmail } from '@/lib/email';
import { invoiceIssuedEmailHtml } from '@/lib/notifications-delivery';

export async function POST() {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    if (!canManageFinance(auth)) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    try {
        const school = await prisma.school.findUnique({
            where: { id: auth.schoolId as string },
            include: {
                users: {
                    where: { role: 'LEARNER' },
                    include: {
                        learnerProfile: {
                            include: {
                                class: { select: { name: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!school) return new NextResponse('School not found', { status: 404 });

        const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        const title = `Monthly Tuition Fee - ${currentMonth}`;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
        let createdCount = 0;
        let notifiedCount = 0;

        for (const learnerUser of school.users) {
            if (!learnerUser.learnerProfile) continue;

            const existing = await prisma.feeInvoice.findFirst({
                where: {
                    schoolId: school.id,
                    learnerId: learnerUser.learnerProfile.id,
                    title,
                },
            });

            if (existing) continue;

            await prisma.feeInvoice.create({
                data: {
                    schoolId: school.id,
                    learnerId: learnerUser.learnerProfile.id,
                    title,
                    amount: school.monthlyFee,
                    dueDate,
                    status: 'PENDING',
                },
            });
            createdCount++;

            const parentIds = learnerUser.learnerProfile.parentIds ?? [];
            if (parentIds.length === 0) continue;

            const parents = await prisma.user.findMany({
                where: { id: { in: parentIds } },
                select: { email: true, firstName: true, lastName: true },
            });

            for (const parent of parents) {
                if (!parent.email) continue;
                const sent = await sendEmail({
                    to: parent.email,
                    subject: `New school fee invoice — ${school.name}`,
                    html: invoiceIssuedEmailHtml({
                        parentName: parent.firstName,
                        learnerName: `${learnerUser.firstName} ${learnerUser.lastName}`,
                        title,
                        amount: school.monthlyFee,
                        dueDate: dueDate.toLocaleDateString('en-ZA'),
                        billingUrl: `${baseUrl}/dashboard/parent/billing`,
                    }),
                });
                if (sent.sent) notifiedCount++;
            }
        }

        await writeAuditLog({
            schoolId: school.id,
            userId: auth.userId,
            action: 'GENERATE_INVOICES',
            entity: 'FEE_INVOICE',
            entityId: school.id,
            details: { createdCount, notifiedCount, title },
        });

        return NextResponse.json({
            message: `Generated ${createdCount} invoices for ${currentMonth}`,
            notifiedParents: notifiedCount,
        });
    } catch (error) {
        console.error(error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
