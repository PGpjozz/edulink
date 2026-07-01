import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { resolveLearnerAccess } from '@/lib/parent-access';

export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const access = await resolveLearnerAccess(auth, searchParams.get('childId'));
    if (!access.ok) return access.response;

    try {
        const grades = await prisma.grade.findMany({
            where: { learnerId: access.learnerProfileId },
            include: { assessment: { include: { subject: true } } },
        });

        if (grades.length === 0) {
            return NextResponse.json({
                insight: 'Not enough data for analysis yet. Complete more assessments to get feedback.',
            });
        }

        const subjectStats: Record<string, number[]> = {};
        grades.forEach((g) => {
            const subName = g.assessment.subject.name;
            if (!subjectStats[subName]) subjectStats[subName] = [];
            subjectStats[subName].push((g.score / g.assessment.totalMarks) * 100);
        });

        const averages = Object.keys(subjectStats).map((name) => ({
            name,
            avg: subjectStats[name].reduce((a, b) => a + b, 0) / subjectStats[name].length,
        }));

        const strongSubjects = averages.filter((s) => s.avg >= 75).map((s) => s.name);
        const weakSubjects = averages.filter((s) => s.avg < 50).map((s) => s.name);

        const insight = {
            summary: `Based on your recent ${grades.length} assessments, your academic profile is becoming clearer.`,
            strengths: strongSubjects.length > 0 ? strongSubjects : ['Starting to show consistency across subjects.'],
            weaknesses: weakSubjects.length > 0 ? weakSubjects : ['Keep maintaining your current effort level.'],
            recommendation: weakSubjects.length > 0
                ? `Focus additional study hours on ${weakSubjects[0]} and consider booking a PTM with the teacher.`
                : 'Great job! Challenge yourself with advanced resources in the Learning Hub.',
            generatedBy: 'EduLink Study Advisor',
        };

        await prisma.aIInsight.create({
            data: {
                learnerId: access.learnerProfileId,
                term: 'Current Term',
                content: insight as object,
            },
        });

        return NextResponse.json(insight);
    } catch (error) {
        console.error(error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
