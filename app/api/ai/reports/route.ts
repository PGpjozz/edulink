import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { canAccessLearner } from '@/lib/staff-context';
import { GRADING_ROLES } from '@/lib/permissions';
import {
    buildSubjectReportComment,
    calculateAttendanceRate,
    calculateSubjectAverage,
} from '@/lib/report-generation';

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

        const [learner, subject, assessmentGrades, attendance, quizAttempts] = await Promise.all([
            prisma.learnerProfile.findUnique({
                where: { id: learnerId },
                include: { user: true, class: { select: { grade: true } } },
            }),
            prisma.subject.findFirst({
                where: { id: subjectId, schoolId: auth.schoolId! },
                select: { id: true, name: true, grade: true },
            }),
            prisma.grade.findMany({
                where: { learnerId, assessment: { subjectId } },
                include: { assessment: { select: { totalMarks: true } } },
            }),
            prisma.attendance.findMany({
                where: { learnerId },
                orderBy: { date: 'desc' },
                take: 30,
            }),
            prisma.quizAttempt.findMany({
                where: { learnerId, quiz: { subjectId } },
                orderBy: { completedAt: 'desc' },
                take: 10,
            }),
        ]);

        if (!learner) {
            return NextResponse.json({ error: 'Learner not found' }, { status: 404 });
        }

        if (!subject) {
            return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
        }

        if (learner.class?.grade && subject.grade !== learner.class.grade) {
            return NextResponse.json(
                { error: `This subject is for Grade ${subject.grade}; the learner is in Grade ${learner.class.grade}` },
                { status: 400 },
            );
        }

        const assessmentAvg = calculateSubjectAverage(assessmentGrades);
        const quizAvg = quizAttempts.length > 0
            ? quizAttempts.reduce((acc, curr) => acc + (curr.score ?? 0), 0) / quizAttempts.length
            : null;
        const avgScore = assessmentAvg ?? quizAvg;
        const attendanceRate = calculateAttendanceRate(attendance);

        const comment = buildSubjectReportComment({
            firstName: learner.user.firstName,
            subjectName: subject.name,
            average: assessmentAvg,
            tone: tone as 'professional' | 'encouraging' | 'concise',
            attendanceRate,
            assessmentCount: assessmentGrades.length,
        });

        return NextResponse.json({
            comment,
            dataPoints: {
                avgScore: avgScore ?? 0,
                assessmentAverage: assessmentAvg ?? 0,
                quizAverage: quizAvg ?? 0,
                attendanceRate: attendanceRate ?? 0,
                assessmentsCount: assessmentGrades.length,
                quizzesCount: quizAttempts.length,
            },
        });
    } catch (error) {
        console.error('AI Comment Error:', error);
        return NextResponse.json({ error: 'Failed to generate comment' }, { status: 500 });
    }
}
