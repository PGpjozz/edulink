import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { canAccessLearner } from '@/lib/staff-context';
import { GRADING_ROLES } from '@/lib/permissions';

export async function POST(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    if (!(GRADING_ROLES as readonly string[]).includes(auth.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { learnerId, subjectId, tone = 'professional' } = await req.json();

        if (!learnerId || !subjectId) {
            return NextResponse.json({ error: 'Learner and subject are required' }, { status: 400 });
        }

        if (!(await canAccessLearner(auth, learnerId))) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const [learner, attendance, attempts] = await Promise.all([
            prisma.learnerProfile.findUnique({
                where: { id: learnerId },
                include: { user: true }
            }),
            prisma.attendance.findMany({
                where: { learnerId },
                take: 10,
                orderBy: { date: 'desc' }
            }),
            prisma.quizAttempt.findMany({
                where: { learnerId, quiz: { subjectId } },
                include: { quiz: true },
                orderBy: { completedAt: 'desc' }
            })
        ]);

        if (!learner) {
            return NextResponse.json({ error: 'Learner not found' }, { status: 404 });
        }

        // 2. Synthesize performance data
        const avgScore = attempts.length > 0
            ? attempts.reduce(
                (acc: number, curr: { score: number | null }) => acc + (curr.score || 0),
                0
            ) / attempts.length
            : null;

        const attendanceRate = attendance.length > 0
            ? (attendance.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE').length / attendance.length) * 100
            : null;

        // 3. Generate a "Smart Comment" (Mocking the AI Generation Logic)
        let comment = '';
        const name = learner.user.firstName;

        if (avgScore && avgScore > 80) {
            comment = `${name} has shown exceptional mastery in this subject. With an average quiz score of ${Math.round(avgScore)}%, they consistently demonstrate deep understanding of complex concepts. `;
        } else if (avgScore && avgScore > 50) {
            comment = `${name} is making steady progress. Their average score of ${Math.round(avgScore)}% indicates a good foundational knowledge, though further practice on core topics would be beneficial. `;
        } else if (avgScore) {
            comment = `${name} has encountered some challenges recently. Their scores suggest that additional support and focused review of recent lessons will help bridge the current gaps in understanding. `;
        } else {
            comment = `${name} is participating well in class, though we are still building a comprehensive pool of assessment data to fully gauge their progress. `;
        }

        if (attendanceRate && attendanceRate < 80) {
            comment += `Regular attendance is crucial for consistent performance, and I encourage ${name} to prioritize every session to avoid missing key instructional blocks. `;
        } else {
            comment += `${name}'s high attendance rate reflects their strong commitment to learning and consistency in the classroom. `;
        }

        if (tone === 'encouraging') {
            comment += `Keep up the great effort, ${name}! Your dedication is evident, and I look forward to seeing your continued growth next term.`;
        } else {
            comment += `Continued focus on the upcoming units will ensure ${name} remains on a positive academic trajectory.`;
        }

        return NextResponse.json({
            comment,
            dataPoints: {
                avgScore: avgScore ?? 0,
                attendanceRate: attendanceRate ?? 0,
                assessmentsCount: attempts.length
            }
        });
    } catch (error) {
        console.error('AI Comment Error:', error);
        return NextResponse.json({ error: 'Failed to generate comment' }, { status: 500 });
    }
}
