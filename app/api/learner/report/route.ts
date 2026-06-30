import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import {
    buildSubjectReportComment,
    calculateAttendanceRate,
    calculateSubjectAverage,
    getCurrentTermLabel,
} from '@/lib/report-generation';

async function resolveLearnerProfile(auth: { userId: string; role: string; schoolId: string | null }, childUserId?: string | null) {
    let learnerUserId = auth.userId;

    if (auth.role === 'PARENT') {
        if (!childUserId) return null;
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
        learnerUserId = childUserId;
    } else if (auth.role !== 'LEARNER') {
        return null;
    }

    return prisma.learnerProfile.findUnique({
        where: { userId: learnerUserId },
        include: {
            class: true,
            user: { select: { firstName: true, lastName: true } },
        },
    });
}

export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const childId = searchParams.get('childId');

    try {
        const learnerProfile = await resolveLearnerProfile(auth, childId);
        if (!learnerProfile?.class) {
            return NextResponse.json({ error: 'Learner not found' }, { status: 404 });
        }

        const school = await prisma.school.findUnique({
            where: { id: auth.schoolId! },
            select: { name: true },
        });

        const [subjects, attendance] = await Promise.all([
            prisma.subject.findMany({
                where: {
                    grade: learnerProfile.class.grade,
                    schoolId: auth.schoolId!,
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
                orderBy: { name: 'asc' },
            }),
            prisma.attendance.findMany({
                where: { learnerId: learnerProfile.id },
            }),
        ]);

        const attendanceRate = calculateAttendanceRate(attendance);

        const reportData = subjects.map((sub) => {
            const grades = sub.assessments.flatMap((a) =>
                a.grades.map((g) => ({ score: g.score, assessment: { totalMarks: a.totalMarks } })),
            );
            const average = calculateSubjectAverage(grades);
            const rounded = average !== null ? Math.round(average) : null;

            return {
                subjectName: sub.name,
                subjectCode: sub.code || '',
                average: rounded,
                comment: buildSubjectReportComment({
                    firstName: learnerProfile.user.firstName,
                    subjectName: sub.name,
                    average: rounded,
                    tone: 'professional',
                    attendanceRate,
                    assessmentCount: grades.length,
                }),
            };
        });

        const gradedSubjects = reportData.filter((r) => r.average !== null);
        const overallAverage = gradedSubjects.length > 0
            ? Math.round(gradedSubjects.reduce((a, b) => a + (b.average ?? 0), 0) / gradedSubjects.length)
            : 0;

        return NextResponse.json({
            learner: {
                name: `${learnerProfile.user.firstName} ${learnerProfile.user.lastName}`,
                grade: learnerProfile.class.grade,
                className: learnerProfile.class.name,
                schoolName: school?.name ?? 'School',
            },
            term: getCurrentTermLabel(),
            issuedAt: new Date().toISOString(),
            subjects: reportData,
            stats: {
                attendanceRate: attendanceRate !== null ? Math.round(attendanceRate) : null,
                overallAverage,
            },
        });
    } catch (error) {
        console.error('Learner report error:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
