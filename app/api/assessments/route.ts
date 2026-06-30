import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';
import { formatAssessmentTitle } from '@/lib/assessment-utils';

export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('subjectId');

    if (!subjectId) {
        return new NextResponse('Subject ID required', { status: 400 });
    }

    try {
        const subject = await prisma.subject.findFirst({
            where: { id: subjectId, schoolId: auth.schoolId as string },
            select: { id: true }
        });

        if (!subject) {
            return new NextResponse('Subject not found', { status: 404 });
        }

        const assessments = await prisma.assessment.findMany({
            where: {
                subjectId,
                subject: { schoolId: auth.schoolId as string }
            },
            orderBy: [{ term: 'desc' }, { date: 'desc' }],
            include: {
                _count: { select: { grades: true } }
            }
        });

        return NextResponse.json(assessments);
    } catch (error) {
        console.error('Error fetching assessments:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireAuth({ roles: ['TEACHER', 'SCHOOL_ADMIN', 'PRINCIPAL'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{
            subjectId?: string;
            title?: string;
            term?: string;
            paper?: string;
            type?: string;
            totalMarks?: number | string;
            weight?: number | string;
            date?: string;
        }>(req);
        if (body instanceof NextResponse) return body;
        const { subjectId, title, term, paper, type, totalMarks, weight, date } = body;

        if (!subjectId || !type || totalMarks === undefined || weight === undefined || !date) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!term?.trim() && !title?.trim()) {
            return NextResponse.json({ error: 'Term or title is required' }, { status: 400 });
        }

        const subject = await prisma.subject.findFirst({
            where: { id: subjectId, schoolId: auth.schoolId as string },
            select: { id: true, name: true, teacherId: true }
        });

        if (!subject) {
            return new NextResponse('Subject not found', { status: 404 });
        }

        if (auth.role === 'TEACHER') {
            const teacherProfile = await prisma.teacherProfile.findUnique({
                where: { userId: auth.userId },
                select: { id: true }
            });

            if (!teacherProfile || subject.teacherId !== teacherProfile.id) {
                return new NextResponse('Forbidden', { status: 403 });
            }
        }

        const totalMarksNum = Number(totalMarks);
        const weightNum = Number(weight);
        if (!Number.isFinite(totalMarksNum) || totalMarksNum <= 0 || !Number.isFinite(weightNum)) {
            return NextResponse.json({ error: 'Invalid numeric fields' }, { status: 400 });
        }

        const dateObj = new Date(date);
        if (Number.isNaN(dateObj.getTime())) {
            return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
        }

        const resolvedTitle = formatAssessmentTitle({
            term: term?.trim(),
            paper: paper?.trim(),
            title: title?.trim(),
            type,
            subjectName: subject.name,
        });

        const assessment = await prisma.assessment.create({
            data: {
                subjectId,
                title: resolvedTitle,
                term: term?.trim() || null,
                paper: paper?.trim() || null,
                type,
                totalMarks: totalMarksNum,
                weight: weightNum,
                date: dateObj
            }
        });

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'CREATE_ASSESSMENT',
            entity: 'ASSESSMENT',
            entityId: assessment.id,
            details: { subjectId, title: resolvedTitle, term, paper, type }
        });

        return NextResponse.json(assessment);
    } catch (error) {
        console.error('Error creating assessment:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
