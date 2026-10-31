import { prisma } from '@/lib/prisma';

/** Put a compulsory subject on every class in its grade. Leaves an existing class teacher in place. */
export async function attachCompulsorySubject(schoolId: string, subjectId: string): Promise<number> {
    const subject = await prisma.subject.findFirst({
        where: { id: subjectId, schoolId, offering: 'COMPULSORY' },
        select: { id: true, grade: true, teacherId: true },
    });
    if (!subject) return 0;

    const classes = await prisma.class.findMany({
        where: { schoolId, grade: subject.grade },
        select: { id: true },
    });

    for (const klass of classes) {
        await prisma.classSubject.upsert({
            where: { classId_subjectId: { classId: klass.id, subjectId: subject.id } },
            create: {
                classId: klass.id,
                subjectId: subject.id,
                teacherProfileId: subject.teacherId,
            },
            update: {},
        });
    }
    return classes.length;
}

/** Optional subjects are linked only to the classes that were chosen. */
export async function assignSubjectToClasses(schoolId: string, subjectId: string, classIds: string[]): Promise<void> {
    const subject = await prisma.subject.findFirst({
        where: { id: subjectId, schoolId },
        select: { id: true, grade: true, teacherId: true, offering: true },
    });
    if (!subject) return;

    if (subject.offering === 'COMPULSORY') {
        await attachCompulsorySubject(schoolId, subjectId);
        return;
    }

    const valid = classIds.length
        ? await prisma.class.findMany({
              where: { schoolId, grade: subject.grade, id: { in: classIds } },
              select: { id: true },
          })
        : [];
    const ids = valid.map((c) => c.id);

    await prisma.classSubject.deleteMany({
        where: {
            subjectId,
            ...(ids.length ? { classId: { notIn: ids } } : {}),
        },
    });

    for (const classId of ids) {
        await prisma.classSubject.upsert({
            where: { classId_subjectId: { classId, subjectId } },
            create: { classId, subjectId, teacherProfileId: subject.teacherId },
            update: {},
        });
    }
}

/** Give a new class every compulsory subject for its grade. */
export async function attachCompulsorySubjectsForClass(schoolId: string, classId: string, grade: string): Promise<number> {
    const subjects = await prisma.subject.findMany({
        where: { schoolId, grade, offering: 'COMPULSORY' },
        select: { id: true, teacherId: true },
    });

    for (const subject of subjects) {
        await prisma.classSubject.upsert({
            where: { classId_subjectId: { classId, subjectId: subject.id } },
            create: {
                classId,
                subjectId: subject.id,
                teacherProfileId: subject.teacherId,
            },
            update: {},
        });
    }
    return subjects.length;
}

/** Link each class to the compulsory subjects for its grade. Optional subjects stay class-specific. */
export async function backfillClassSubjectsForSchool(schoolId: string): Promise<number> {
    const [classes, subjects] = await Promise.all([
        prisma.class.findMany({ where: { schoolId }, select: { id: true, grade: true } }),
        prisma.subject.findMany({
            where: { schoolId, offering: 'COMPULSORY' },
            select: { id: true, grade: true, teacherId: true },
        }),
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
                update: {},
            });
            count++;
        }
    }
    return count;
}
