import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'PRINCIPAL' && session.user.role !== 'PROVIDER')) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const school = await prisma.school.findUnique({
            where: { id: session.user.schoolId || '' },
            include: {
                users: {
                    where: { role: 'LEARNER' },
                    include: { learnerProfile: true }
                }
            }
        });

        if (!school) return new NextResponse('School not found', { status: 404 });

        const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        const title = `Monthly Tuition Fee - ${currentMonth}`;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

        const batch = school.users
            .filter(u => u.learnerProfile)
            .map(u => ({
                schoolId: school.id,
                learnerId: u.learnerProfile!.id,
                title,
                amount: school.monthlyFee,
                dueDate,
                status: 'PENDING' as const
            }));

        // To avoid duplicates for the same month, we'd normally check here.
        // For MVP, we'll just create them. In production, we'd check if title exists for student.

        let createdCount = 0;
        for (const invoiceData of batch) {
            // Upsert-like check to prevent double billing in same month
            const existing = await prisma.feeInvoice.findFirst({
                where: {
                    learnerId: invoiceData.learnerId,
                    title: invoiceData.title
                }
            });

            if (!existing) {
                await prisma.feeInvoice.create({ data: invoiceData });
                createdCount++;
            }
        }

        return NextResponse.json({
            message: `Generated ${createdCount} invoices for ${currentMonth}`,
            total: batch.length
        });
    } catch (error) {
        console.error(error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
