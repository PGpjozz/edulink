import { sendEmail } from './email';
import { BRAND } from './branding';

type ParentAlertParams = {
    phoneNumber?: string | null;
    email?: string | null;
    parentName: string;
    title: string;
    message: string;
    link?: string;
};

/** SMS via Africa's Talking, Twilio, or console fallback in development. */
export async function sendSms(to: string, message: string): Promise<{ sent: boolean; channel: 'sms' | 'console' }> {
    const trimmed = to.replace(/\s/g, '');
    if (!trimmed) return { sent: false, channel: 'console' };

    const apiKey = process.env.SMS_API_KEY;
    const from = process.env.SMS_FROM_NUMBER;

    if (!apiKey || !from) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[SMS:dev] TO: ${trimmed} | ${message}`);
        }
        return { sent: false, channel: 'console' };
    }

    // Generic webhook-style SMS provider (configure SMS_WEBHOOK_URL for your vendor)
    const webhook = process.env.SMS_WEBHOOK_URL;
    if (webhook) {
        try {
            const res = await fetch(webhook, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ to: trimmed, from, body: message }),
            });
            return { sent: res.ok, channel: 'sms' };
        } catch (err) {
            console.error('SMS delivery failed:', err);
            return { sent: false, channel: 'sms' };
        }
    }

    console.log(`[SMS:unconfigured] TO: ${trimmed} | ${message}`);
    return { sent: false, channel: 'console' };
}

export async function notifyParent(params: ParentAlertParams): Promise<void> {
    const smsBody = `${params.title}: ${params.message}`;

    if (params.phoneNumber) {
        await sendSms(params.phoneNumber, smsBody);
    }

    if (params.email) {
        await sendEmail({
            to: params.email,
            subject: params.title,
            html: `
                <p>Hi ${params.parentName},</p>
                <p>${params.message}</p>
                ${params.link ? `<p><a href="${params.link}">View in ${BRAND.name}</a></p>` : ''}
            `,
            text: smsBody,
        });
    }
}

export function invoiceIssuedEmailHtml(params: {
    parentName: string;
    learnerName: string;
    title: string;
    amount: number;
    dueDate: string;
    billingUrl: string;
}) {
    return `
        <p>Hi ${params.parentName},</p>
        <p>A new school fee invoice has been issued for <strong>${params.learnerName}</strong>.</p>
        <p><strong>${params.title}</strong><br/>Amount: R ${params.amount.toFixed(2)}<br/>Due: ${params.dueDate}</p>
        <p><a href="${params.billingUrl}">View and pay in ${BRAND.name}</a></p>
    `;
}
