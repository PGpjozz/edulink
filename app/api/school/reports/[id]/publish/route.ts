import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, writeAuditLog } from '@/lib/api-auth';
import { createNotifications } from '@/lib/notifications';
import { sendEmail, reportPublishedEmailHtml } from '@/lib/email';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth({ schoolAdmin: true, requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const report = await prisma.reportCard.findFirst({
        where: { id, schoolId: auth.schoolId as string },
        include: {
            learner: {
                include: {
                    user: { select: { id: true, firstName: true, lastName: true } },
                },
            },
            school: { select: { name: true } },
        },
    });
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    if (report.status !== 'PUBLISHED') {
        await prisma.reportCard.update({
            where: { id: report.id },
            data: { status: 'PUBLISHED', publishedAt: new Date() },
        });
    }

    const learnerName = `${report.learner.user.firstName} ${report.learner.user.lastName}`;
    const appUrl = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '');

    // Notify the learner and their linked parents in-app.
    const parents = await prisma.user.findMany({
        where: { id: { in: report.learner.parentIds }, isActive: true },
        select: { id: true, email: true, firstName: true },
    });

    const recipientIds = [report.learner.user.id, ...parents.map((p) => p.id)];
    await createNotifications(
        recipientIds.map((userId) => ({
            userId,
            title: `${report.termLabel} report available`,
            message: `The ${report.termLabel} academic report for ${learnerName} has been published.`,
            type: 'ACADEMIC' as const,
            link: '/dashboard/learner/reports',
        })),
    );

    // Best-effort email to parents (no-op when Resend is not configured).
    let emailsSent = 0;
    for (const parent of parents) {
        if (!parent.email) continue;
        const res = await sendEmail({
            to: parent.email,
            subject: `${report.termLabel} report for ${learnerName}`,
            html: reportPublishedEmailHtml({
                schoolName: report.school.name,
                learnerName,
                termLabel: report.termLabel,
                overallAverage: report.overallAverage,
                viewUrl: `${appUrl}/dashboard/parent/child/${report.learner.user.id}`,
                recipientName: parent.firstName ?? undefined,
            }),
        });
        if (res.sent) emailsSent += 1;
    }

    await writeAuditLog({
        schoolId: auth.schoolId,
        userId: auth.userId,
        action: 'PUBLISH_REPORT',
        entity: 'REPORT_CARD',
        entityId: report.id,
        details: { learnerId: report.learnerId, term: report.term, year: report.year, emailsSent },
    });

    return NextResponse.json({ ok: true, notified: recipientIds.length, emailsSent });
}
