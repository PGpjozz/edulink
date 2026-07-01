import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { resolveLearnerAccess } from '@/lib/parent-access';
import { capsLevel, currentSchoolTerm } from '@/lib/caps';

export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const access = await resolveLearnerAccess(auth, searchParams.get('childId'));
    if (!access.ok) return access.response;

    try {
        const [learnerProfile, school] = await Promise.all([
            prisma.learnerProfile.findUnique({
                where: { userId: access.learnerUserId },
                include: {
                    class: true,
                    user: { select: { firstName: true, lastName: true, schoolId: true } },
                },
            }),
            prisma.school.findUnique({
                where: { id: auth.schoolId as string },
                select: { name: true },
            }),
        ]);

        if (!learnerProfile?.user || learnerProfile.user.schoolId !== auth.schoolId) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        if (!learnerProfile.class) {
            return new NextResponse('Learner not found', { status: 404 });
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

        const term = currentSchoolTerm();

        const reportData = uniqueSubjects.map((sub) => {
            const grades = sub.assessments.flatMap((a) => a.grades).map((g) => {
                const assessment = sub.assessments.find((as) => as.id === g.assessmentId);
                return assessment ? (g.score / assessment.totalMarks) * 100 : 0;
            });
            const average = grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : null;
            const rounded = average ? Math.round(average) : null;
            const caps = rounded != null ? capsLevel(rounded) : null;

            return {
                subjectName: sub.name,
                subjectCode: sub.code || '',
                average: rounded,
                level: caps?.level ?? null,
                comment: caps?.descriptor ?? 'No assessments recorded',
            };
        });

        const attendance = await prisma.attendance.findMany({
            where: { learnerId: learnerProfile.id },
        });

        const totalDays = attendance.length;
        const presentDays = attendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
        const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 100;

        const graded = reportData.filter((r) => r.average !== null);

        return NextResponse.json({
            learner: {
                name: `${learnerProfile.user.firstName} ${learnerProfile.user.lastName}`,
                grade: learnerProfile.class.grade,
                className: learnerProfile.class.name,
                schoolName: school?.name ?? 'School',
            },
            term: term.label,
            subjects: reportData,
            stats: {
                attendanceRate: Math.round(attendanceRate),
                overallAverage:
                    graded.length > 0
                        ? Math.round(graded.reduce((a, b) => a + (b.average || 0), 0) / graded.length)
                        : 0,
            },
        });
    } catch {
        return new NextResponse('Internal Error', { status: 500 });
    }
}
