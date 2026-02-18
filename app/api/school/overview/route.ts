import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

export const runtime = 'nodejs';

export async function GET() {
    const auth = await requireAuth({ roles: ['PRINCIPAL', 'SCHOOL_ADMIN'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const schoolId = auth.schoolId as string;

        const dueSoonDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const [
            learners,
            staff,
            teachers,
            parents,
            classes,
            classesUnassigned,
            subjects,
            subjectsUnassigned,
            assetsByStatus,
            bookingsPending,
            invoicesPendingAgg,
            invoicesOverdueAgg,
            invoicesDueSoonCount,
            recentInvoices,
            recentBookings,
            recentBehavior
        ] = await Promise.all([
            prisma.learnerProfile.count({ where: { user: { schoolId } } }),
            prisma.user.count({
                where: {
                    schoolId,
                    isActive: true,
                    role: { in: ['PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER'] }
                }
            }),
            prisma.user.count({ where: { schoolId, role: 'TEACHER', isActive: true } }),
            prisma.user.count({ where: { schoolId, role: 'PARENT', isActive: true } }),
            prisma.class.count({ where: { schoolId } }),
            prisma.class.count({ where: { schoolId, teacherProfileId: null } }),
            prisma.subject.count({ where: { schoolId } }),
            prisma.subject.count({ where: { schoolId, teacherId: null } }),
            prisma.asset.groupBy({
                by: ['status'],
                where: { schoolId },
                _count: { _all: true }
            }),
            prisma.assetBooking.count({ where: { status: 'PENDING', asset: { schoolId } } }),
            prisma.feeInvoice.aggregate({
                where: { schoolId, status: 'PENDING' },
                _sum: { amount: true },
                _count: { _all: true }
            }),
            prisma.feeInvoice.aggregate({
                where: { schoolId, status: 'OVERDUE' },
                _sum: { amount: true },
                _count: { _all: true }
            }),
            prisma.feeInvoice.count({
                where: {
                    schoolId,
                    status: 'PENDING',
                    dueDate: { lte: dueSoonDate }
                }
            }),
            prisma.feeInvoice.findMany({
                where: { schoolId },
                include: {
                    learner: {
                        include: { user: { select: { firstName: true, lastName: true } } }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 5
            }),
            prisma.assetBooking.findMany({
                where: { asset: { schoolId } },
                include: {
                    asset: { select: { name: true, identifier: true } },
                    user: { select: { firstName: true, lastName: true, role: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 5
            }),
            prisma.behaviorRecord.findMany({
                where: { learner: { user: { schoolId } } },
                include: {
                    learner: { include: { user: { select: { firstName: true, lastName: true } } } },
                    teacher: { select: { firstName: true, lastName: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 5
            })
        ]);

        const assets = assetsByStatus.reduce(
            (acc: any, row: any) => {
                acc.total += row._count?._all ?? 0;
                acc.byStatus[row.status] = row._count?._all ?? 0;
                return acc;
            },
            { total: 0, byStatus: {} as Record<string, number> }
        );

        const pendingAmount = Number(invoicesPendingAgg._sum.amount ?? 0);
        const overdueAmount = Number(invoicesOverdueAgg._sum.amount ?? 0);

        return NextResponse.json({
            lastUpdated: new Date().toISOString(),
            kpis: {
                learners,
                teachers,
                parents,
                staff,
                classes,
                classesUnassigned,
                subjects,
                subjectsUnassigned,
                assets: {
                    total: assets.total,
                    available: assets.byStatus.AVAILABLE ?? 0,
                    checkedOut: assets.byStatus.CHECKED_OUT ?? 0,
                    maintenance: assets.byStatus.MAINTENANCE ?? 0,
                    lost: assets.byStatus.LOST ?? 0
                },
                bookingsPending,
                invoices: {
                    pendingAmount,
                    overdueAmount,
                    pendingCount: invoicesPendingAgg._count._all,
                    overdueCount: invoicesOverdueAgg._count._all,
                    dueSoonCount: invoicesDueSoonCount
                }
            },
            recent: {
                invoices: recentInvoices.map((inv) => ({
                    id: inv.id,
                    title: inv.title,
                    amount: inv.amount,
                    status: inv.status,
                    dueDate: inv.dueDate,
                    createdAt: inv.createdAt,
                    learnerName: `${inv.learner.user.firstName} ${inv.learner.user.lastName}`
                })),
                bookings: recentBookings.map((b) => ({
                    id: b.id,
                    status: b.status,
                    startDate: b.startDate,
                    endDate: b.endDate,
                    createdAt: b.createdAt,
                    assetName: b.asset.name,
                    assetIdentifier: b.asset.identifier,
                    userName: `${b.user.firstName} ${b.user.lastName}`,
                    userRole: b.user.role
                })),
                behavior: recentBehavior.map((r) => ({
                    id: r.id,
                    type: r.type,
                    category: r.category,
                    points: r.points,
                    reason: r.reason,
                    createdAt: r.createdAt,
                    learnerName: `${r.learner.user.firstName} ${r.learner.user.lastName}`,
                    teacherName: `${r.teacher.firstName} ${r.teacher.lastName}`
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching school overview:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
