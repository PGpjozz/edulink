import { prisma } from '@/lib/prisma';
import { capsLevel, termDateRange, termLabel } from '@/lib/caps';

export type SubjectResult = {
    subjectId: string;
    subjectName: string;
    subjectCode: string | null;
    percentage: number | null;
    capsLevel: number | null;
    capsDescriptor: string | null;
    assessmentCount: number;
};

export type LearnerTermResult = {
    subjects: SubjectResult[];
    overallAverage: number | null;
    attendanceRate: number | null;
};

/**
 * Compute a learner's weighted academic results for a single term.
 * A subject's percentage is the weight-weighted mean of its assessments
 * (falling back to a simple mean when all weights are zero). Only assessments
 * dated within the term window are counted.
 */
export async function computeLearnerTermResult(params: {
    schoolId: string;
    learnerId: string;
    grade: string;
    term: number;
    year: number;
}): Promise<LearnerTermResult> {
    const { schoolId, learnerId, grade, term, year } = params;
    const { start, end } = termDateRange(term, year);

    const subjects = await prisma.subject.findMany({
        where: { schoolId, grade },
        include: {
            assessments: {
                where: { date: { gte: start, lt: end } },
                include: { grades: { where: { learnerId } } },
            },
        },
        orderBy: { name: 'asc' },
    });

    // De-duplicate subjects that share a code/name across classes of the same grade.
    const seen = new Set<string>();
    const uniqueSubjects = subjects.filter((s) => {
        const key = s.code || s.name;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    const results: SubjectResult[] = uniqueSubjects.map((sub) => {
        let weightedSum = 0;
        let weightTotal = 0;
        let simpleSum = 0;
        let count = 0;

        for (const assessment of sub.assessments) {
            const grade = assessment.grades[0];
            if (!grade || assessment.totalMarks <= 0) continue;
            const pct = (grade.score / assessment.totalMarks) * 100;
            const weight = assessment.weight > 0 ? assessment.weight : 0;
            weightedSum += pct * weight;
            weightTotal += weight;
            simpleSum += pct;
            count += 1;
        }

        let percentage: number | null = null;
        if (count > 0) {
            percentage = weightTotal > 0 ? weightedSum / weightTotal : simpleSum / count;
            percentage = Math.round(percentage);
        }

        const caps = percentage != null ? capsLevel(percentage) : null;

        return {
            subjectId: sub.id,
            subjectName: sub.name,
            subjectCode: sub.code || null,
            percentage,
            capsLevel: caps?.level ?? null,
            capsDescriptor: caps?.descriptor ?? null,
            assessmentCount: count,
        };
    });

    const graded = results.filter((r) => r.percentage != null);
    const overallAverage =
        graded.length > 0
            ? Math.round(graded.reduce((acc, r) => acc + (r.percentage ?? 0), 0) / graded.length)
            : null;

    const attendance = await prisma.attendance.findMany({
        where: { learnerId, date: { gte: start, lt: end } },
        select: { status: true },
    });
    const attendanceRate =
        attendance.length > 0
            ? Math.round(
                  (attendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length /
                      attendance.length) *
                      100,
              )
            : null;

    return { subjects: results, overallAverage, attendanceRate };
}

export { termLabel };
