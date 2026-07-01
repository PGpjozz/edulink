import { prisma } from '@/lib/prisma';

/** Link each class to grade-matching subjects and copy the subject's assigned teacher. */
export async function backfillClassSubjectsForSchool(schoolId: string): Promise<number> {
    const [classes, subjects] = await Promise.all([
        prisma.class.findMany({ where: { schoolId }, select: { id: true, grade: true } }),
        prisma.subject.findMany({ where: { schoolId }, select: { id: true, grade: true, teacherId: true } }),
    ]);

    let count = 0;
    for (const klass of classes) {
        for (const subject of subjects.filter((s) => s.grade === klass.grade)) {
            await prisma.classSubject.upsert({
                where: { classId_subjectId: { classId: klass.id, subjectId: subject.id } },
                create: {
                    classId: klass.id,
                    subjectId: subject.id,
                    teacherProfileId: subject.teacherId,
                },
                update: {
                    teacherProfileId: subject.teacherId ?? undefined,
                },
            });
            count++;
        }
    }
    return count;
}
