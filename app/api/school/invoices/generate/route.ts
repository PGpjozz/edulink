import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, writeAuditLog } from '@/lib/api-auth';

export async function POST(req: Request) {
    const auth = await requireAuth({ roles: ['PRINCIPAL', 'SCHOOL_ADMIN'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const school = await prisma.school.findUnique({
            where: { id: auth.schoolId as string },
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
                    schoolId: invoiceData.schoolId,
                    learnerId: invoiceData.learnerId,
                    title: invoiceData.title
                }
            });

            if (!existing) {
                await prisma.feeInvoice.create({ data: invoiceData });
                createdCount++;
            }
        }

        await writeAuditLog({
            schoolId: school.id,
            userId: auth.userId,
            action: 'GENERATE_INVOICES',
            entity: 'FEE_INVOICE',
            entityId: school.id,
            details: { createdCount, totalLearners: batch.length, title }
        });

        return NextResponse.json({
            message: `Generated ${createdCount} invoices for ${currentMonth}`,
            total: batch.length
        });
    } catch (error) {
        console.error(error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
