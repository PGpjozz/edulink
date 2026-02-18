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
        learnerUserId = childId;
    }

    try {
        const learnerProfile = await prisma.learnerProfile.findUnique({
            where: { userId: learnerUserId },
            include: {
                class: true,
                user: { select: { firstName: true, lastName: true } }
            }
        });

        if (!learnerProfile || !learnerProfile.class) {
            return new NextResponse('Learner not found', { status: 404 });
        }

        // 1. Get Subjects and Grades
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

        const reportData = subjects.map(sub => {
            const grades = sub.assessments.flatMap(a => a.grades).map(g => {
                const assessment = sub.assessments.find(as => as.id === g.assessmentId);
                return assessment ? (g.score / assessment.totalMarks) * 100 : 0;
            });
            const average = grades.length > 0 ? grades.reduce((a: number, b: number) => a + b, 0) / grades.length : null;

            return {
                subjectName: sub.name,
                subjectCode: sub.code || '',
                average: average ? Math.round(average) : null,
                comment: average && average >= 50 ? 'Satisfactory achievement' : 'Needs improvement'
            };
        });

        // 2. Get Attendance Stats
        const attendance = await prisma.attendance.findMany({
            where: { learnerId: learnerProfile.id }
        });

        const totalDays = attendance.length;
        const presentDays = attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
        const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 100;

        return NextResponse.json({
            learner: {
                name: `${learnerProfile.user.firstName} ${learnerProfile.user.lastName}`,
                grade: learnerProfile.class.grade,
                className: learnerProfile.class.name,
                schoolName: 'EduLink Academy' // In real app, fetch from school model
            },
            subjects: reportData,
            stats: {
                attendanceRate: Math.round(attendanceRate),
                overallAverage: reportData.filter(r => r.average !== null).length > 0
                    ? Math.round(reportData.filter(r => r.average !== null).reduce((a: number, b) => a + (b.average || 0), 0) / reportData.filter(r => r.average !== null).length)
                    : 0
            }
        });

    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}
