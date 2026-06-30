import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import {
    buildSubjectReportComment,
    calculateAttendanceRate,
    calculateSubjectAverage,
} from '@/lib/report-generation';

async function resolveLearnerProfileId(
    auth: { userId: string; role: string; schoolId: string | null },
    childUserId?: string | null,
): Promise<string | null> {
    if (auth.role === 'LEARNER') {
        const profile = await prisma.learnerProfile.findUnique({
            where: { userId: auth.userId },
            select: { id: true },
        });
        return profile?.id ?? null;
    }

    if (auth.role === 'PARENT' && childUserId) {
        const parentProfile = await prisma.parentProfile.findUnique({
            where: { userId: auth.userId },
            select: { learnerIds: true },
        });
        const candidate = await prisma.learnerProfile.findUnique({
            where: { userId: childUserId },
            select: { id: true },
        });
        if (!candidate || !parentProfile?.learnerIds.includes(candidate.id)) {
            return null;
        }
        return candidate.id;
    }

    return null;
}

export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const childId = searchParams.get('childId');

    try {
        const learnerProfileId = await resolveLearnerProfileId(auth, childId);
        if (!learnerProfileId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const learnerProfile = await prisma.learnerProfile.findUnique({
            where: { id: learnerProfileId },
            include: { user: { select: { firstName: true } } },
        });

        if (!learnerProfile) {
            return new NextResponse('Profile not found', { status: 404 });
        }

        const grades = await prisma.grade.findMany({
            where: { learnerId: learnerProfileId },
            include: { assessment: { include: { subject: true } } },
        });

        const attendance = await prisma.attendance.findMany({
            where: { learnerId: learnerProfileId },
            orderBy: { date: 'desc' },
            take: 30,
        });
        const attendanceRate = calculateAttendanceRate(attendance);

        if (grades.length === 0) {
            return NextResponse.json({
                summary: 'Not enough assessment data for AI analysis yet. Complete more assessments to get personalised feedback.',
                strengths: ['Engaged in class activities'],
                weaknesses: ['Complete more assessments to unlock detailed insights'],
                recommendation: 'Focus on upcoming tests and check the Learning Hub for revision resources.',
                generatedBy: 'EduLink AI Engine v1.0',
            });
        }

        const subjectStats: Record<string, { grades: { score: number; assessment: { totalMarks: number } }[] }> = {};
        grades.forEach((g) => {
            const subName = g.assessment.subject.name;
            if (!subjectStats[subName]) subjectStats[subName] = { grades: [] };
            subjectStats[subName].grades.push({
                score: g.score,
                assessment: { totalMarks: g.assessment.totalMarks },
            });
        });

        const averages = Object.entries(subjectStats).map(([name, data]) => ({
            name,
            avg: calculateSubjectAverage(data.grades) ?? 0,
        }));

        const strongSubjects = averages.filter((s) => s.avg >= 75).map((s) => s.name);
        const weakSubjects = averages.filter((s) => s.avg < 50).map((s) => s.name);
        const firstName = learnerProfile.user.firstName;

        const insight = {
            summary: buildSubjectReportComment({
                firstName,
                subjectName: 'overall academics',
                average: averages.reduce((a, b) => a + b.avg, 0) / averages.length,
                tone: 'encouraging',
                attendanceRate,
                assessmentCount: grades.length,
            }),
            strengths: strongSubjects.length > 0 ? strongSubjects : ['Showing consistency across subjects'],
            weaknesses: weakSubjects.length > 0 ? weakSubjects : ['Maintain current study habits'],
            recommendation: weakSubjects.length > 0
                ? `Focus additional study on ${weakSubjects[0]} and review recent assessment feedback with your teacher.`
                : 'Great progress! Explore extension activities in the Learning Hub to stay challenged.',
            generatedBy: 'EduLink AI Engine v1.0',
        };

        await prisma.aIInsight.create({
            data: {
                learnerId: learnerProfileId,
                term: 'Current Term',
                content: insight as object,
            },
        });

        return NextResponse.json(insight);
    } catch (error) {
        console.error('Learner insights error:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
