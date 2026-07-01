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

    const learnerUserId = access.learnerUserId;

    try {
        const learnerProfile = await prisma.learnerProfile.findUnique({
            where: { userId: learnerUserId },
            include: {
                class: true,
                user: { select: { firstName: true, lastName: true, schoolId: true } },
            },
        });

        if (!learnerProfile?.user || learnerProfile.user.schoolId !== auth.schoolId) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        if (!learnerProfile.class) {
            return NextResponse.json({ learner: null, subjects: [] });
        }

        const subjects = await prisma.subject.findMany({
            where: {
                grade: learnerProfile.class.grade,
                schoolId: auth.schoolId as string,
            },
            include: {
                assessments: {
                    include: {
                        grades: {
                            where: { learnerId: learnerProfile.id },
                        },
                    },
                },
            },
        });

        const seenCodes = new Set<string>();
        const uniqueSubjects = subjects.filter((sub) => {
            const key = sub.code || sub.name;
            if (seenCodes.has(key)) return false;
            seenCodes.add(key);
            return true;
        });

        const processedSubjects = uniqueSubjects.map((sub) => {
            const assessmentsWithGrades = sub.assessments.map((ass) => {
                const gradeEntry = ass.grades[0];
                return {
                    id: ass.id,
                    title: ass.title,
                    totalMarks: ass.totalMarks,
                    userScore: gradeEntry?.score || null,
                    percentage: gradeEntry ? (gradeEntry.score / ass.totalMarks) * 100 : null,
                };
            });

            const gradedAssessments = assessmentsWithGrades.filter((a) => a.percentage !== null);
            const average =
                gradedAssessments.length > 0
                    ? gradedAssessments.reduce((acc, curr) => acc + (curr.percentage || 0), 0) /
                      gradedAssessments.length
                    : null;

            return {
                id: sub.id,
                name: sub.name,
                code: sub.code,
                average: average ? Math.round(average) : null,
                assessments: assessmentsWithGrades,
            };
        });

        return NextResponse.json({
            learner: {
                id: learnerProfile.id,
                name: `${learnerProfile.user.firstName} ${learnerProfile.user.lastName}`,
                grade: learnerProfile.class.grade,
                className: learnerProfile.class.name,
                timetable: learnerProfile.class.timetable,
            },
            subjects: processedSubjects,
        });
    } catch {
        return new NextResponse('Internal Error', { status: 500 });
    }
}
