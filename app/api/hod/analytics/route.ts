import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { getStaffContext } from '@/lib/staff-context';
import { canViewSchoolAnalytics } from '@/lib/permissions';

function processTrendData(
    items: { createdAt?: Date; date?: Date; score?: number; value?: number }[],
    valueKey: 'score' | 'value',
) {
    const byMonth: Record<string, { sum: number; count: number }> = {};
    for (const item of items) {
        const d = item.createdAt ?? item.date;
        if (!d) continue;
        const key = d.toLocaleString('en-ZA', { month: 'short', year: '2-digit' });
        const val = valueKey === 'score' ? (item.score ?? 0) : (item.value ?? 0);
        if (!byMonth[key]) byMonth[key] = { sum: 0, count: 0 };
        byMonth[key].sum += val;
        byMonth[key].count += 1;
    }
    return Object.entries(byMonth).map(([month, { sum, count }]) => ({
        month,
        value: count > 0 ? Math.round(sum / count) : 0,
    }));
}

export async function GET() {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    if (!canViewSchoolAnalytics(auth)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const schoolId = auth.schoolId as string;
        const ctx = await getStaffContext(auth);

        const subjectFilter =
            auth.role === 'HOD' && ctx.departmentIdsLed.length > 0
                ? {
                      OR: [
                          { departmentId: { in: ctx.departmentIdsLed } },
                          { id: { in: ctx.assignedSubjectIds } },
                      ],
                  }
                : {};

        const grades = await prisma.grade.findMany({
            where: {
                assessment: {
                    subject: { schoolId, ...subjectFilter },
                },
            },
            select: { score: true, createdAt: true, assessment: { select: { totalMarks: true } } },
        });

        const gradePercents = grades.map((g) => ({
            score: g.assessment.totalMarks > 0 ? (g.score / g.assessment.totalMarks) * 100 : 0,
            createdAt: g.createdAt,
        }));

        const academicTrend = processTrendData(gradePercents, 'score');

        const subjects = await prisma.subject.findMany({
            where: { schoolId, ...subjectFilter },
            select: {
                id: true,
                name: true,
                code: true,
                assessments: {
                    select: {
                        grades: { select: { score: true } },
                        totalMarks: true,
                    },
                },
            },
        });

        const subjectPerformance = subjects.map((sub) => {
            const percents: number[] = [];
            sub.assessments.forEach((a) => {
                a.grades.forEach((g) => {
                    if (a.totalMarks > 0) percents.push((g.score / a.totalMarks) * 100);
                });
            });
            const avg =
                percents.length > 0
                    ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length)
                    : null;
            return { name: sub.code || sub.name, fullName: sub.name, average: avg };
        });

        const behavior = await prisma.behaviorRecord.findMany({
            where: {
                learner: {
                    user: { schoolId },
                    ...(ctx.departmentIdsLed.length > 0 && auth.role === 'HOD'
                        ? {
                              class: {
                                  classSubjects: {
                                      some: { subject: { departmentId: { in: ctx.departmentIdsLed } } },
                                  },
                              },
                          }
                        : {}),
                },
            },
            select: { category: true, points: true },
        });

        const behaviorDistribution = behavior.reduce<Record<string, number>>((acc, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + curr.points;
            return acc;
        }, {});

        return NextResponse.json({
            scope: auth.role === 'HOD' ? 'department' : 'school',
            academic: { trend: academicTrend },
            subjectPerformance: subjectPerformance.filter((s) => s.average !== null),
            behavior: Object.entries(behaviorDistribution).map(([name, value]) => ({ name, value })),
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
    }
}
