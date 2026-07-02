import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BRAND } from '@/lib/branding';
import { canManageSchool } from '@/lib/permissions';

function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const report = await prisma.reportCard.findUnique({
        where: { id },
        include: {
            entries: { orderBy: { subjectName: 'asc' } },
            learner: {
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, schoolId: true } },
                },
            },
            school: { select: { name: true } },
        },
    });

    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    const role = session.user.role;
    const sameSchool = session.user.schoolId === report.schoolId;
    const isStaff = sameSchool && (canManageSchool(role) || role === 'HOD' || role === 'TEACHER');
    const isOwner = session.user.id === report.learner.user.id;
    let isParent = false;
    if (role === 'PARENT') {
        const parent = await prisma.parentProfile.findUnique({
            where: { userId: session.user.id },
            select: { learnerIds: true },
        });
        isParent = Boolean(parent?.learnerIds.includes(report.learnerId));
    }

    // Learners/parents may only print published reports.
    const canView = isStaff || ((isOwner || isParent) && report.status === 'PUBLISHED');
    if (!canView) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const learnerName = `${report.learner.user.firstName} ${report.learner.user.lastName}`;
    const issued = report.publishedAt ?? report.updatedAt;

    const rows = report.entries
        .map(
            (e) => `
        <tr>
          <td>${escapeHtml(e.subjectName)}</td>
          <td class="center">${e.capsLevel != null ? `Level ${e.capsLevel}` : '—'}</td>
          <td class="center">${e.percentage != null ? `${e.percentage}%` : 'N/A'}</td>
          <td class="muted">${escapeHtml(e.teacherComment || e.capsDescriptor || 'No comment')}</td>
        </tr>`,
        )
        .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(BRAND.name)} Report — ${escapeHtml(learnerName)} — ${escapeHtml(report.termLabel)}</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #1e293b; padding: 0 16px; }
    h1 { margin-bottom: 2px; }
    .muted { color: #64748b; }
    .center { text-align: center; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .stats { display: flex; gap: 32px; margin: 16px 0 24px; }
    .stat b { font-size: 1.4rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    th { text-transform: uppercase; font-size: 0.72rem; color: #64748b; }
    .comment { margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; }
    .sign { display: flex; justify-content: space-between; margin-top: 56px; }
    .sign div { border-top: 2px solid #cbd5e1; padding-top: 8px; width: 220px; text-align: center; font-weight: 700; font-size: 0.85rem; }
    .print-btn { margin: 24px 0; }
    @media print { .print-btn { display: none; } body { margin: 0; } }
  </style>
</head>
<body>
  <div class="print-btn"><button onclick="window.print()">Print / Save as PDF</button></div>
  <div class="head">
    <div>
      <p class="muted" style="font-weight:700;letter-spacing:1px;margin:0">${escapeHtml(BRAND.name.toUpperCase())}</p>
      <h1>Academic Report</h1>
      <p class="muted" style="margin:0">${escapeHtml(report.school.name)}</p>
    </div>
    <div style="text-align:right">
      <p style="font-weight:700;margin:0">${escapeHtml(report.termLabel)}</p>
      <p class="muted" style="margin:0">Issued: ${issued.toLocaleDateString('en-ZA')}</p>
      <p class="muted" style="margin:0">${report.status === 'PUBLISHED' ? 'Published' : 'Draft (preview)'}</p>
    </div>
  </div>

  <h2 style="margin-bottom:0">${escapeHtml(learnerName)}</h2>
  <p class="muted" style="margin-top:4px">Grade ${escapeHtml(report.grade)} · ${escapeHtml(report.className)}</p>

  <div class="stats">
    <div class="stat"><div class="muted">Overall average</div><b>${report.overallAverage != null ? `${report.overallAverage}%` : 'N/A'}</b></div>
    <div class="stat"><div class="muted">Attendance</div><b>${report.attendanceRate != null ? `${report.attendanceRate}%` : 'N/A'}</b></div>
  </div>

  <table>
    <thead>
      <tr><th>Subject</th><th class="center">CAPS Level</th><th class="center">Achievement</th><th>Teacher observations</th></tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="4" class="muted center">No subjects recorded</td></tr>'}</tbody>
  </table>

  ${report.principalComment ? `<div class="comment"><strong>Principal's comment:</strong><br/>${escapeHtml(report.principalComment)}</div>` : ''}

  <div class="sign">
    <div>Class Teacher</div>
    <div>Executive Principal</div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}
