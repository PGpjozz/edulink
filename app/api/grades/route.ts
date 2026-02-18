import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';

export async function GET(req: Request) {
    const auth = await requireAuth({ roles: ['TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN', 'LEARNER', 'PARENT'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const assessmentId = searchParams.get('assessmentId');

    if (!assessmentId) {
        return new NextResponse('Assessment ID required', { status: 400 });
    }

    try {
        const assessment = await prisma.assessment.findFirst({
            where: { id: assessmentId, subject: { schoolId: auth.schoolId as string } },
            select: { id: true, subject: { select: { teacherId: true } } }
        });

        if (!assessment) {
            return new NextResponse('Assessment not found', { status: 404 });
        }

        if (auth.role === 'TEACHER') {
            const teacherProfile = await prisma.teacherProfile.findUnique({
                where: { userId: auth.userId },
                select: { id: true }
            });
            if (!teacherProfile || assessment.subject.teacherId !== teacherProfile.id) {
                return new NextResponse('Forbidden', { status: 403 });
            }
        }

        const grades = await prisma.grade.findMany({
            where: {
                assessmentId,
                assessment: { subject: { schoolId: auth.schoolId as string } }
            },
            include: {
                learner: {
                    include: { user: { select: { firstName: true, lastName: true, idNumber: true } } }
                }
            }
        });

        if (auth.role === 'LEARNER') {
            const learnerProfile = await prisma.learnerProfile.findUnique({
                where: { userId: auth.userId },
                select: { id: true }
            });
            if (!learnerProfile) return NextResponse.json([]);
            return NextResponse.json(grades.filter((g) => g.learnerId === learnerProfile.id));
        }

        if (auth.role === 'PARENT') {
            const parentProfile = await prisma.parentProfile.findUnique({
                where: { userId: auth.userId },
                select: { learnerIds: true }
            });
            if (!parentProfile?.learnerIds?.length) return NextResponse.json([]);
            return NextResponse.json(grades.filter((g) => parentProfile.learnerIds.includes(g.learnerId)));
        }

        return NextResponse.json(grades);
    } catch (error) {
        console.error('Error fetching grades:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireAuth({ roles: ['TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<any>(req);
        if (body instanceof NextResponse) return body;
        const { assessmentId, grades } = body; // grades: [{ learnerId, score, comments }]

        if (!assessmentId || !Array.isArray(grades)) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const assessment = await prisma.assessment.findFirst({
            where: { id: assessmentId, subject: { schoolId: auth.schoolId as string } },
            select: { id: true, subject: { select: { teacherId: true } } }
        });

        if (!assessment) {
            return new NextResponse('Assessment not found', { status: 404 });
        }

        if (auth.role === 'TEACHER') {
            const teacherProfile = await prisma.teacherProfile.findUnique({
                where: { userId: auth.userId },
                select: { id: true }
            });
            if (!teacherProfile || assessment.subject.teacherId !== teacherProfile.id) {
                return new NextResponse('Forbidden', { status: 403 });
            }
        }

        const learnerIds = grades.map((g: any) => g.learnerId).filter(Boolean);
        if (learnerIds.length !== grades.length) {
            return new NextResponse('Invalid grades payload', { status: 400 });
        }

        const validLearnerCount = await prisma.learnerProfile.count({
            where: { id: { in: learnerIds }, user: { schoolId: auth.schoolId as string } }
        });

        if (validLearnerCount !== learnerIds.length) {
            return new NextResponse('Invalid learnerIds', { status: 400 });
        }

        // Bulk upsert using transaction or Promise.all
        // Prisma createMany doesn't support upsert, so we loop
        const results = await prisma.$transaction(async (tx) => {
            const upserts = await Promise.all(
                grades.map((g: any) =>
                    tx.grade.upsert({
                        where: {
                            assessmentId_learnerId: {
                                assessmentId,
                                learnerId: g.learnerId
                            }
                        },
                        update: {
                            score: Number(g.score),
                            comments: g.comments
                        },
                        create: {
                            assessmentId,
                            learnerId: g.learnerId,
                            score: Number(g.score),
                            comments: g.comments
                        }
                    })
                )
            );

            return upserts;
        });

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'UPDATE_GRADES',
            entity: 'ASSESSMENT',
            entityId: assessmentId,
            details: { learnerCount: grades.length }
        });

        return NextResponse.json(results);
    } catch (error) {
        console.error('Error saving grades:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
