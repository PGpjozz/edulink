type SendEmailParams = {
    to: string;
    subject: string;
    html: string;
    text?: string;
};

export async function sendEmail(params: SendEmailParams): Promise<{ sent: boolean; error?: string }> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM ?? 'EduLink <onboarding@resend.dev>';

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
    return `
        <p>Hi ${name},</p>
        <p>You've been invited to join <strong>${params.schoolName}</strong> on EduLink as <strong>${roleLabel}</strong>.</p>
        <p><a href="${params.acceptUrl}">Accept your invite and set your password</a></p>
        <p>This link expires in 7 days.</p>
        <p>If you didn't expect this email, you can ignore it.</p>
    `;
}

export function passwordResetEmailHtml(params: { tempPassword: string; signInUrl: string }) {
    return `
        <p>Your EduLink password was reset.</p>
        <p>Sign in with this temporary password: <strong>${params.tempPassword}</strong></p>
        <p>You will be asked to change it immediately after signing in.</p>
        <p><a href="${params.signInUrl}">Sign in to EduLink</a></p>
    `;
}
