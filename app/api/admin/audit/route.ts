import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: Request) {
    const auth = await requireAuth({ roles: ['PROVIDER'] });
    if (auth instanceof NextResponse) return auth;

    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get('schoolId');
        const action = searchParams.get('action');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const format = searchParams.get('format');
        const limit = Math.min(Number(searchParams.get('limit') ?? 200), 1000);
        const offset = Number(searchParams.get('offset') ?? 0);

        const where: {
            schoolId?: string;
            action?: string;
            createdAt?: { gte?: Date; lte?: Date };
        } = {};

        if (schoolId) where.schoolId = schoolId;
        if (action) where.action = action;
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) where.createdAt.lte = new Date(to);
        }

        const logs = await prisma.auditLog.findMany({
            where,
            include: {
                user: { select: { firstName: true, lastName: true, role: true, email: true } },
                school: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });

        if (format === 'csv') {
            const header = 'Time,User,Role,School,Action,Entity,Details\n';
            const rows = logs
                .map((log) => {
                    const cols = [
                        log.createdAt.toISOString(),
                        `${log.user?.firstName ?? ''} ${log.user?.lastName ?? ''}`.trim(),
                        log.user?.role ?? '',
                        log.school?.name ?? '',
                        log.action,
                        log.entity,
                        JSON.stringify(log.details ?? {}),
                    ];
                    return cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',');
                })
                .join('\n');

            return new NextResponse(header + rows, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': 'attachment; filename="brightcampus-audit.csv"',
                },
            });
        }

        const total = await prisma.auditLog.count({ where });

        return NextResponse.json({ logs, total, limit, offset });
    } catch (error) {
        console.error('audit GET', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
