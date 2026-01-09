import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const { searchParams } = new URL(req.url);
    const childId = searchParams.get('childId');

    try {
        let learnerId: string;

        if (session.user.role === 'PARENT' && childId) {
            learnerId = childId;
        } else if (session.user.role === 'LEARNER') {
            const profile = await prisma.learnerProfile.findUnique({ where: { userId: session.user.id } });
            if (!profile) return new NextResponse('Profile not found', { status: 404 });
            learnerId = profile.id;
        } else {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Fetch grades for analysis
        const grades = await prisma.grade.findMany({
            where: { learnerId },
            include: { assessment: { include: { subject: true } } }
        });

        if (grades.length === 0) {
            return NextResponse.json({
                insight: "Not enough data for AI analysis yet. Complete more assessments to get feedback."
            });
        }

        // --- SIMULATED AI ANALYSIS LOGIC ---
        // Group by subject
        const subjectStats: any = {};
        grades.forEach(g => {
            const subName = g.assessment.subject.name;
            if (!subjectStats[subName]) subjectStats[subName] = [];
            subjectStats[subName].push((g.score / g.assessment.totalMarks) * 100);
        });

        const averages = Object.keys(subjectStats).map(name => ({
            name,
            avg: subjectStats[name].reduce((a, b) => a + b, 0) / subjectStats[name].length
        }));

        const strongSubjects = averages.filter(s => s.avg >= 75).map(s => s.name);
        const weakSubjects = averages.filter(s => s.avg < 50).map(s => s.name);

        const insight = {
            summary: `Based on your recent ${grades.length} assessments, your academic profile is becoming clearer.`,
            strengths: strongSubjects.length > 0 ? strongSubjects : ["Starting to show consistency across subjects."],
            weaknesses: weakSubjects.length > 0 ? weakSubjects : ["Keep maintaining your current effort level."],
            recommendation: weakSubjects.length > 0
                ? `Focus additional study hours on ${weakSubjects[0]} and consider booking a PTM with the teacher.`
                : "Great job! Challenge yourself with advanced resources in the Learning Hub.",
            generatedBy: "EduLink AI Engine v1.0"
        };

        // Cache the insight
        await prisma.aiInsight.create({
            data: {
                learnerId,
                term: "Current Term",
                content: insight as any
            }
        });

        return NextResponse.json(insight);
    } catch (error) {
        console.error(error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
