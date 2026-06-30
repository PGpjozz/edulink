import { prisma } from '@/lib/prisma';
import {
    buildSubjectReportComment,
    calculateAttendanceRate,
    calculateSubjectAverage,
    getCurrentTermLabel,
} from '@/lib/report-generation';

export type ReportSubjectRow = {
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    average: number | null;
    comment: string;
    isTeacherComment: boolean;
};

export type LearnerReportData = {
    learner: {
        id: string;
        userId: string;
        name: string;
        grade: string;
        className: string;
        schoolName: string;
    };
    term: string;
    issuedAt: string;
    subjects: ReportSubjectRow[];
    stats: {
        attendanceRate: number | null;
        overallAverage: number;
    };
};

export async function buildLearnerReportData(
    learnerProfileId: string,
    schoolId: string,
    term = getCurrentTermLabel(),
): Promise<LearnerReportData | null> {
    const learnerProfile = await prisma.learnerProfile.findFirst({
        where: { id: learnerProfileId, user: { schoolId } },
        include: {
            class: true,
            user: { select: { id: true, firstName: true, lastName: true } },
        },
    });

    if (!learnerProfile?.class) return null;

    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true },
    });

    const [subjects, attendance, savedComments] = await Promise.all([
        prisma.subject.findMany({
            where: { grade: learnerProfile.class.grade, schoolId },
            include: {
                assessments: {
                    include: {
                        grades: { where: { learnerId: learnerProfile.id } },
                    },
                },
            },
            orderBy: { name: 'asc' },
        }),
        prisma.attendance.findMany({ where: { learnerId: learnerProfile.id } }),
        prisma.reportComment.findMany({
            where: { learnerId: learnerProfile.id, term },
            select: { subjectId: true, comment: true },
        }),
    ]);

    const commentBySubject = new Map(savedComments.map((c) => [c.subjectId, c.comment]));
    const attendanceRate = calculateAttendanceRate(attendance);

    const reportSubjects: ReportSubjectRow[] = subjects.map((sub) => {
        const grades = sub.assessments.flatMap((a) =>
            a.grades.map((g) => ({ score: g.score, assessment: { totalMarks: a.totalMarks } })),
        );
        const average = calculateSubjectAverage(grades);
        const rounded = average !== null ? Math.round(average) : null;
        const saved = commentBySubject.get(sub.id);

        return {
            subjectId: sub.id,
            subjectName: sub.name,
            subjectCode: sub.code || '',
            average: rounded,
            comment: saved ?? buildSubjectReportComment({
                firstName: learnerProfile.user.firstName,
                subjectName: sub.name,
                average: rounded,
                tone: 'professional',
                attendanceRate,
                assessmentCount: grades.length,
            }),
            isTeacherComment: Boolean(saved),
        };
    });

    const graded = reportSubjects.filter((r) => r.average !== null);
    const overallAverage = graded.length > 0
        ? Math.round(graded.reduce((a, b) => a + (b.average ?? 0), 0) / graded.length)
        : 0;

    return {
        learner: {
            id: learnerProfile.id,
            userId: learnerProfile.user.id,
            name: `${learnerProfile.user.firstName} ${learnerProfile.user.lastName}`,
            grade: learnerProfile.class.grade,
            className: learnerProfile.class.name,
            schoolName: school?.name ?? 'School',
        },
        term,
        issuedAt: new Date().toISOString(),
        subjects: reportSubjects,
        stats: {
            attendanceRate: attendanceRate !== null ? Math.round(attendanceRate) : null,
            overallAverage,
        },
    };
}

export async function resolveLearnerProfileForReport(
    auth: { userId: string; role: string; schoolId: string | null },
    options: { childUserId?: string | null; learnerProfileId?: string | null } = {},
): Promise<string | null> {
    const { childUserId, learnerProfileId } = options;

    if (learnerProfileId) {
        const profile = await prisma.learnerProfile.findFirst({
            where: { id: learnerProfileId, user: { schoolId: auth.schoolId! } },
            select: { id: true },
        });
        return profile?.id ?? null;
    }

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
        if (!candidate || !parentProfile?.learnerIds.includes(candidate.id)) return null;
        return candidate.id;
    }

    return null;
}
