import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';
import { sendEmail, billingReminderEmailHtml } from '@/lib/email';
import { BRAND } from '@/lib/branding';

export async function POST(req: Request) {
    const auth = await requireAuth({ roles: ['PROVIDER'] });
    if (auth instanceof NextResponse) return auth;

    const body = await readJson<{ billingId?: string }>(req);
    if (body instanceof NextResponse) return body;

    if (!body.billingId) {
        return NextResponse.json({ error: 'billingId required' }, { status: 400 });
    }

    const billing = await prisma.billing.findUnique({
        where: { id: body.billingId },
        include: {
            school: {
                select: {
                    id: true,
                    name: true,
                    contactEmail: true,
                    owner: { select: { email: true, firstName: true } },
                },
            },
        },
    });

    if (!billing || billing.status !== 'PAST_DUE') {
        return NextResponse.json({ error: 'Overdue bill not found' }, { status: 404 });
    }

    const to = billing.school.owner?.email ?? billing.school.contactEmail;
    if (!to) {
        return NextResponse.json({ error: 'No contact email for school' }, { status: 400 });
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const daysOverdue = Math.floor((Date.now() - billing.createdAt.getTime()) / (1000 * 60 * 60 * 24));

    const result = await sendEmail({
        to,
        subject: `Payment reminder — ${billing.school.name} ${BRAND.name} subscription`,
        html: billingReminderEmailHtml({
            schoolName: billing.school.name,
            contactName: billing.school.owner?.firstName ?? 'there',
            amount: billing.totalAmount,
            daysOverdue,
            payUrl: `${baseUrl}/dashboard/principal/subscription`,
        }),
    });

    await writeAuditLog({
        schoolId: billing.schoolId,
        userId: auth.userId,
        action: 'BILLING_REMINDER_SENT',
        entity: 'BILLING',
        entityId: billing.id,
        details: { to, daysOverdue, emailSent: result.sent },
    });

    return NextResponse.json({ ok: true, emailSent: result.sent, error: result.error });
}
