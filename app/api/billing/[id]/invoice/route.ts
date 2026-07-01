import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BRAND } from '@/lib/branding';
import { billingStatusLabel, formatBillingPeriod } from '@/lib/subscription';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    const billing = await prisma.billing.findUnique({
        where: { id },
        include: { school: { select: { id: true, name: true, contactEmail: true, tier: true } } },
    });

    if (!billing) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const isProvider = session?.user?.role === 'PROVIDER';
    const isSchoolStaff =
        session?.user?.schoolId === billing.schoolId &&
        ['SCHOOL_OWNER', 'PRINCIPAL', 'SCHOOL_ADMIN'].includes(session.user.role);

    if (!isProvider && !isSchoolStaff) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${BRAND.name} Invoice — ${billing.school.name}</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; max-width: 720px; margin: 40px auto; color: #1e293b; }
    h1 { margin-bottom: 4px; }
    .muted { color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #e2e8f0; }
    .total { font-size: 1.25rem; font-weight: 700; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>${BRAND.name}</h1>
  <p class="muted">Brighter Schools. Smarter Management.</p>
  <h2>Subscription Invoice</h2>
  <p><strong>${billing.school.name}</strong><br/>
  Plan: ${billing.school.tier}<br/>
  Period: ${formatBillingPeriod(billing.periodStart, billing.periodEnd)}<br/>
  Status: ${billingStatusLabel(billing.status)}<br/>
  Invoice #: ${billing.id.slice(0, 8).toUpperCase()}</p>
  <table>
    <thead><tr><th>Description</th><th>Amount (ZAR)</th></tr></thead>
    <tbody>
      <tr><td>Platform subscription</td><td>R ${billing.baseAmount.toFixed(2)}</td></tr>
      ${
          billing.extraLearners > 0
              ? `<tr><td>Learner overage (${billing.extraLearners})</td><td>R ${billing.extraAmount.toFixed(2)}</td></tr>`
              : ''
      }
      <tr><td class="total">Total due</td><td class="total">R ${billing.totalAmount.toFixed(2)}</td></tr>
    </tbody>
  </table>
  <p class="muted" style="margin-top:32px">Generated ${new Date().toLocaleString('en-ZA')}</p>
</body>
</html>`;

    return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}
