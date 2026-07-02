import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, writeAuditLog, readJson } from '@/lib/api-auth';
import { canManageSchool } from '@/lib/permissions';
import { computeLearnerTermResult } from '@/lib/reports';
import { termLabel } from '@/lib/caps';

export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;
    if (!canManageSchool(auth.role) && auth.role !== 'HOD') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const term = searchParams.get('term');
    const year = searchParams.get('year');
    const status = searchParams.get('status');
    const grade = searchParams.get('grade');

    const reports = await prisma.reportCard.findMany({
        where: {
            schoolId: auth.schoolId as string,
            ...(term ? { term: Number(term) } : {}),
            ...(year ? { year: Number(year) } : {}),
            ...(status === 'DRAFT' || status === 'PUBLISHED' ? { status } : {}),
            ...(grade ? { grade } : {}),
        },
        include: {
            learner: { include: { user: { select: { firstName: true, lastName: true } } } },
            _count: { select: { entries: true } },
        },
        orderBy: [{ year: 'desc' }, { term: 'desc' }, { className: 'asc' }],
    });

    return NextResponse.json(
        reports.map((r) => ({
            id: r.id,
            learnerName: `${r.learner.user.firstName} ${r.learner.user.lastName}`,
            term: r.term,
            year: r.year,
            termLabel: r.termLabel,
            grade: r.grade,
            className: r.className,
            status: r.status,
            overallAverage: r.overallAverage,
            attendanceRate: r.attendanceRate,
            subjectCount: r._count.entries,
            publishedAt: r.publishedAt,
        })),
    );
}

export async function POST(req: Request) {
    const auth = await requireAuth({ schoolAdmin: true, requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const body = await readJson<{ term?: number; year?: number; classId?: string }>(req);
    if (body instanceof NextResponse) return body;

    const term = Number(body.term);
    const year = Number(body.year);
    if (!Number.isInteger(term) || term < 1 || term > 4 || !Number.isInteger(year)) {
        return NextResponse.json({ error: 'Valid term (1-4) and year are required' }, { status: 400 });
    }

    const schoolId = auth.schoolId as string;

    const learners = await prisma.learnerProfile.findMany({
        where: {
            user: { schoolId, isActive: true },
            classId: body.classId ? body.classId : { not: null },
            ...(body.classId ? {} : {}),
        },
        include: { class: { select: { id: true, name: true, grade: true, schoolId: true } } },
    });

    const scoped = learners.filter((l) => l.class && l.class.schoolId === schoolId);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const learner of scoped) {
        const klass = learner.class!;
        const existing = await prisma.reportCard.findUnique({
            where: { learnerId_term_year: { learnerId: learner.id, term, year } },
            include: { entries: true },
        });

        if (existing?.status === 'PUBLISHED') {
            skipped += 1;
            continue;
        }

        const result = await computeLearnerTermResult({
            schoolId,
            learnerId: learner.id,
            grade: klass.grade,
            term,
            year,
        });

        // Preserve any teacher comments already captured on a draft.
        const priorComments = new Map(
            (existing?.entries ?? []).map((e) => [e.subjectId, e.teacherComment]),
        );

        await prisma.$transaction(async (tx) => {
            const report = await tx.reportCard.upsert({
                where: { learnerId_term_year: { learnerId: learner.id, term, year } },
                create: {
                    schoolId,
                    learnerId: learner.id,
                    term,
                    year,
                    termLabel: termLabel(term, year),
                    grade: klass.grade,
                    className: klass.name,
                    status: 'DRAFT',
                    overallAverage: result.overallAverage,
                    attendanceRate: result.attendanceRate,
                },
                update: {
                    grade: klass.grade,
                    className: klass.name,
                    overallAverage: result.overallAverage,
                    attendanceRate: result.attendanceRate,
                },
            });

            await tx.reportCardEntry.deleteMany({ where: { reportCardId: report.id } });
            if (result.subjects.length > 0) {
                await tx.reportCardEntry.createMany({
                    data: result.subjects.map((s) => ({
                        reportCardId: report.id,
                        subjectId: s.subjectId,
                        subjectName: s.subjectName,
                        subjectCode: s.subjectCode,
                        percentage: s.percentage,
                        capsLevel: s.capsLevel,
                        capsDescriptor: s.capsDescriptor,
                        assessmentCount: s.assessmentCount,
                        teacherComment: priorComments.get(s.subjectId) ?? null,
                    })),
                });
            }
        });

        if (existing) updated += 1;
        else created += 1;
    }

    await writeAuditLog({
        schoolId,
        userId: auth.userId,
        action: 'GENERATE_REPORTS',
        entity: 'REPORT_CARD',
        entityId: `${term}-${year}`,
        details: { term, year, classId: body.classId ?? null, created, updated, skipped },
    });

    return NextResponse.json({ created, updated, skipped, total: scoped.length });
}
