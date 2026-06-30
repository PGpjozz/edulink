import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';
import { parseGradesCsv, validateGradeScore } from '@/lib/assessment-utils';

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function authorizeAssessment(assessmentId: string, auth: { schoolId: string | null; userId: string; role: string }) {
    const assessment = await prisma.assessment.findFirst({
        where: { id: assessmentId, subject: { schoolId: auth.schoolId! } },
        select: {
            id: true,
            totalMarks: true,
            subjectId: true,
            subject: { select: { teacherId: true } },
        },
    });

    if (!assessment) return null;

    if (auth.role === 'TEACHER') {
        const teacherProfile = await prisma.teacherProfile.findUnique({
            where: { userId: auth.userId },
            select: { id: true },
        });
        if (!teacherProfile || assessment.subject.teacherId !== teacherProfile.id) return null;
    }

    return assessment;
}

export async function POST(req: Request) {
    const auth = await requireAuth({ roles: ['TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{ assessmentId?: string; subjectId?: string; csv?: string }>(req);
        if (body instanceof NextResponse) return body;

        const { assessmentId, subjectId, csv } = body;
        if (!assessmentId || !subjectId || !csv?.trim()) {
            return NextResponse.json({ error: 'assessmentId, subjectId, and csv are required' }, { status: 400 });
        }

        const assessment = await authorizeAssessment(assessmentId, auth);
        if (!assessment) {
            return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
        }

        const { rows, errors: parseErrors } = parseGradesCsv(csv);
        if (rows.length === 0) {
            return NextResponse.json(
                { error: 'No valid rows found in CSV', details: parseErrors },
                { status: 400 },
            );
        }

        const learners = await prisma.learnerProfile.findMany({
            where: {
                class: {
                    schoolId: auth.schoolId!,
                    classSubjects: { some: { subjectId } },
                },
            },
            include: {
                user: { select: { firstName: true, lastName: true, idNumber: true } },
            },
        });

        const byId = new Map(learners.map((l) => [l.id, l]));
        const byIdNumber = new Map(
            learners.filter((l) => l.user.idNumber).map((l) => [l.user.idNumber!.toLowerCase(), l]),
        );
        const byName = new Map(
            learners.map((l) => [`${l.user.firstName} ${l.user.lastName}`.toLowerCase(), l]),
        );

        const gradesToSave: { learnerId: string; score: number; comments?: string }[] = [];
        const errors = [...parseErrors];
        const unmatched: string[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            let learner =
                (row.learnerId && byId.get(row.learnerId)) ||
                (row.idNumber && byIdNumber.get(row.idNumber.toLowerCase())) ||
                (row.name && byName.get(row.name.toLowerCase())) ||
                null;

            if (!learner) {
                const ref = row.idNumber || row.name || row.learnerId || `row ${i + 2}`;
                unmatched.push(String(ref));
                continue;
            }

            const validation = validateGradeScore(row.score, assessment.totalMarks);
            if (!validation.valid) {
                errors.push(`${learner.user.firstName} ${learner.user.lastName}: ${validation.error}`);
                continue;
            }

            gradesToSave.push({
                learnerId: learner.id,
                score: row.score,
                comments: row.comments,
            });
        }

        if (gradesToSave.length === 0) {
            return NextResponse.json(
                {
                    error: 'No grades could be imported',
                    details: errors,
                    unmatched,
                },
                { status: 400 },
            );
        }

        const results = await prisma.$transaction(async (tx: TxClient) => {
            return Promise.all(
                gradesToSave.map((g) =>
                    tx.grade.upsert({
                        where: {
                            assessmentId_learnerId: { assessmentId, learnerId: g.learnerId },
                        },
                        update: { score: g.score, comments: g.comments },
                        create: {
                            assessmentId,
                            learnerId: g.learnerId,
                            score: g.score,
                            comments: g.comments,
                        },
                    }),
                ),
            );
        });

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'IMPORT_GRADES',
            entity: 'ASSESSMENT',
            entityId: assessmentId,
            details: { imported: gradesToSave.length, unmatched: unmatched.length, errors: errors.length },
        });

        return NextResponse.json({
            imported: results.length,
            unmatched,
            errors,
        });
    } catch (error) {
        console.error('Grade import error:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
