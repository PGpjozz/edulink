import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let learnerUserId = session.user.id;

    if (session.user.role === 'PARENT') {
        const childId = searchParams.get('childId');
        if (!childId) return new NextResponse('Child ID required', { status: 400 });
        // In real app, check if childId is in parentProfile.learnerIds
        learnerUserId = childId;
    }

    try {
        // 1. Get Learner Profile to find Class
        const learnerProfile = await prisma.learnerProfile.findUnique({
            where: { userId: learnerUserId },
            include: { class: true }
        });

        if (!learnerProfile || !learnerProfile.class) {
            return NextResponse.json({ learner: null, subjects: [] });
        }

        // 2. Get Subjects for this Class Grade
        const subjects = await prisma.subject.findMany({
            where: {
                grade: learnerProfile.class.grade,
                schoolId: session.user.schoolId
            },
            include: {
                assessments: {
                    include: {
                        grades: {
                            where: { learnerId: learnerProfile.id }
                        }
                    }
                }
            }
        });

        // 3. Process Data
        const processedSubjects = subjects.map(sub => {
            const assessmentsWithGrades = sub.assessments.map(ass => {
                const gradeEntry = ass.grades[0];
                return {
                    id: ass.id,
                    title: ass.title,
                    totalMarks: ass.totalMarks,
                    userScore: gradeEntry?.score || null,
                    percentage: gradeEntry ? (gradeEntry.score / ass.totalMarks) * 100 : null
                };
            });

            // Calculate Subject Average (Simple average of percentages for now)
            const gradedAssessments = assessmentsWithGrades.filter(a => a.percentage !== null);
            const average = gradedAssessments.length > 0
                ? gradedAssessments.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / gradedAssessments.length
                : null;

            return {
                id: sub.id,
                name: sub.name,
                code: sub.code,
                average: average ? Math.round(average) : null,
                assessments: assessmentsWithGrades
            };
        });

        return NextResponse.json({
            learner: {
                name: `${session.user.name}`, // Should fetch specific learner name if needed
                grade: learnerProfile.class.grade,
                className: learnerProfile.class.name,
                timetable: learnerProfile.class.timetable // Added
            },
            subjects: processedSubjects
        });

    } catch (error) {
        // console.error('Error fetching learner dashboard:', error);
        // Silent fail for now if DB not connected to avoid clutter
        return new NextResponse('Internal Error', { status: 500 });
    }
}
