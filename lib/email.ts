import { BRAND, brandEmailFrom } from './branding';

type SendEmailParams = {
    to: string;
    subject: string;
    html: string;
    text?: string;
};

function emailLayout(body: string): string {
    const appUrl = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '');
    const logo = appUrl
        ? `<img src="${appUrl}${BRAND.logoUrl}" alt="${BRAND.name}" width="240" style="max-width: 240px; height: auto; margin-bottom: 24px;" />`
        : `<p style="font-size: 20px; font-weight: 700; color: #1e3a5f; margin: 0 0 16px;">${BRAND.name}</p>`;

    return `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
            ${logo}
            ${body}
            <p style="color: #64748b; font-size: 12px; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                ${BRAND.name} — ${BRAND.tagline}
            </p>
        </div>
    `;
}

export async function sendEmail(params: SendEmailParams): Promise<{ sent: boolean; error?: string }> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = brandEmailFrom();

    if (!apiKey) {
        return { sent: false, error: 'RESEND_API_KEY not configured' };
    }

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from,
                to: [params.to],
                subject: params.subject,
                html: params.html,
                text: params.text,
            }),
        });

        if (!res.ok) {
            const body = await res.text();
            console.error('Resend error:', body);
            return { sent: false, error: 'Email delivery failed' };
        }

        return { sent: true };
    } catch (err) {
        console.error('sendEmail error:', err);
        return { sent: false, error: 'Email delivery failed' };
    }
}

export function inviteEmailHtml(params: {
    schoolName: string;
    role: string;
    acceptUrl: string;
    firstName?: string | null;
}) {
    const name = params.firstName?.trim() || 'there';
    const roleLabel = params.role.replace(/_/g, ' ').toLowerCase();
    return emailLayout(`
        <p>Hi ${name},</p>
        <p>You've been invited to join <strong>${params.schoolName}</strong> on ${BRAND.name} as <strong>${roleLabel}</strong>.</p>
        <p><a href="${params.acceptUrl}">Accept your invite and set your password</a></p>
        <p>This link expires in 7 days.</p>
        <p>If you didn't expect this email, you can ignore it.</p>
    `);
}

export function passwordResetEmailHtml(params: { resetUrl: string }) {
    return emailLayout(`
        <p>We received a request to reset your ${BRAND.name} password.</p>
        <p><a href="${params.resetUrl}">Reset your password</a></p>
        <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
    `);
}

export function passwordResetConfirmEmailHtml(params: { signInUrl: string }) {
    return emailLayout(`
        <p>Your ${BRAND.name} password was changed successfully.</p>
        <p><a href="${params.signInUrl}">Sign in to ${BRAND.name}</a></p>
    `);
}

/** @deprecated Use passwordResetEmailHtml with reset link */
export function passwordResetTempEmailHtml(params: { tempPassword: string; signInUrl: string }) {
    return emailLayout(`
        <p>Your ${BRAND.name} password was reset.</p>
        <p>Sign in with this temporary password: <strong>${params.tempPassword}</strong></p>
        <p>You will be asked to change it immediately after signing in.</p>
        <p><a href="${params.signInUrl}">Sign in to ${BRAND.name}</a></p>
    `);
}

export function onboardWelcomeEmailHtml(params: {
    schoolName: string;
    role: string;
    email: string;
    tempPassword: string;
    signInUrl: string;
    firstName?: string;
}) {
    const name = params.firstName?.trim() || 'there';
    return emailLayout(`
        <p>Hi ${name},</p>
        <p>Welcome to <strong>${params.schoolName}</strong> on ${BRAND.name}! Your ${params.role} account is ready.</p>
        <p><strong>Email:</strong> ${params.email}<br/>
        <strong>Temporary password:</strong> ${params.tempPassword}</p>
        <p>Please sign in and change your password immediately:</p>
        <p><a href="${params.signInUrl}">Sign in to ${BRAND.name}</a></p>
    `);
}

export function billingReminderEmailHtml(params: {
    schoolName: string;
    contactName: string;
    amount: number;
    daysOverdue: number;
    payUrl: string;
}) {
    return emailLayout(`
        <p>Hi ${params.contactName},</p>
        <p>This is a friendly reminder that the <strong>${params.schoolName}</strong> subscription on ${BRAND.name} is overdue by <strong>${params.daysOverdue} day(s)</strong>.</p>
        <p><strong>Amount due:</strong> R ${params.amount.toFixed(2)}</p>
        <p><a href="${params.payUrl}">View subscription and pay now</a></p>
        <p>If you've already paid, you can ignore this message.</p>
    `);
}
