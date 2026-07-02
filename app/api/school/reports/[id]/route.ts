import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson } from '@/lib/api-auth';
import { canManageSchool } from '@/lib/permissions';
import { getStaffContext } from '@/lib/staff-context';

async function loadReport(id: string, schoolId: string) {
    return prisma.reportCard.findFirst({
        where: { id, schoolId },
        include: {
            entries: { orderBy: { subjectName: 'asc' } },
            learner: { include: { user: { select: { firstName: true, lastName: true } } } },
            school: { select: { name: true } },
        },
    });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;
    if (!canManageSchool(auth.role) && auth.role !== 'HOD' && auth.role !== 'TEACHER') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const report = await loadReport(id, auth.schoolId as string);
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    return NextResponse.json({
        id: report.id,
        learnerName: `${report.learner.user.firstName} ${report.learner.user.lastName}`,
        schoolName: report.school.name,
        term: report.term,
        year: report.year,
        termLabel: report.termLabel,
        grade: report.grade,
        className: report.className,
        status: report.status,
        overallAverage: report.overallAverage,
        attendanceRate: report.attendanceRate,
        principalComment: report.principalComment,
        publishedAt: report.publishedAt,
        entries: report.entries.map((e) => ({
            id: e.id,
            subjectId: e.subjectId,
            subjectName: e.subjectName,
            subjectCode: e.subjectCode,
            percentage: e.percentage,
            capsLevel: e.capsLevel,
            capsDescriptor: e.capsDescriptor,
            assessmentCount: e.assessmentCount,
            teacherComment: e.teacherComment,
        })),
    });
}

type PatchBody = {
    principalComment?: string;
    entries?: { id: string; teacherComment: string }[];
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const isAdmin = canManageSchool(auth.role);
    if (!isAdmin && auth.role !== 'HOD' && auth.role !== 'TEACHER') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const report = await prisma.reportCard.findFirst({
        where: { id, schoolId: auth.schoolId as string },
        include: { entries: true },
    });
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    if (report.status === 'PUBLISHED') {
        return NextResponse.json({ error: 'Published reports cannot be edited' }, { status: 409 });
    }

    const body = await readJson<PatchBody>(req);
    if (body instanceof NextResponse) return body;

    // Teachers may only edit comments for subjects they are assigned to.
    let editableSubjectIds: Set<string> | null = null;
    if (!isAdmin && auth.role !== 'HOD') {
        const ctx = await getStaffContext(auth);
        editableSubjectIds = new Set(ctx.assignedSubjectIds);
    } else if (auth.role === 'HOD') {
        const ctx = await getStaffContext(auth);
        editableSubjectIds = new Set(ctx.assignedSubjectIds);
    }

    const entryById = new Map(report.entries.map((e) => [e.id, e]));

    await prisma.$transaction(async (tx) => {
        for (const patch of body.entries ?? []) {
            const entry = entryById.get(patch.id);
            if (!entry) continue;
            if (editableSubjectIds && !editableSubjectIds.has(entry.subjectId)) continue;
            await tx.reportCardEntry.update({
                where: { id: entry.id },
                data: { teacherComment: patch.teacherComment },
            });
        }

        if (isAdmin && body.principalComment !== undefined) {
            await tx.reportCard.update({
                where: { id: report.id },
                data: { principalComment: body.principalComment },
            });
        }
    });

    const updated = await loadReport(id, auth.schoolId as string);
    return NextResponse.json({ ok: true, entries: updated?.entries.length ?? 0 });
}
