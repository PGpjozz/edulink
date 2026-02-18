import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth({ roles: ['TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN', 'LEARNER'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const { id } = await params;

        const assessment = await prisma.assessment.findFirst({
            where: { id, subject: { schoolId: auth.schoolId as string } },
            select: { id: true, subjectId: true, subject: { select: { teacherId: true } } }
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

        // Teachers see all submissions for assessment, Learners see only their own
        const where: any = { assessmentId: id };
        if (auth.role === 'LEARNER') {
            const profile = await prisma.learnerProfile.findUnique({ where: { userId: auth.userId } });
            if (!profile) return NextResponse.json([]);
            where.learnerId = profile.id;
        }

        const submissions = await prisma.assignmentSubmission.findMany({
            where,
            include: {
                learner: {
                    include: {
                        user: { select: { firstName: true, lastName: true } }
                    }
                }
            },
            orderBy: { submittedAt: 'desc' }
        });
        return NextResponse.json(submissions);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth({ roles: ['LEARNER'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const { id } = await params;

        const assessment = await prisma.assessment.findFirst({
            where: { id, subject: { schoolId: auth.schoolId as string } },
            select: { id: true }
        });

        if (!assessment) {
            return new NextResponse('Assessment not found', { status: 404 });
        }

        const body = await readJson<{ fileUrl?: string }>(req);
        if (body instanceof NextResponse) return body;
        const { fileUrl } = body;

        if (!fileUrl) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const profile = await prisma.learnerProfile.findUnique({ where: { userId: auth.userId } });
        if (!profile) return new NextResponse('Learner profile not found', { status: 404 });

        const submission = await prisma.assignmentSubmission.upsert({
            where: {
                assessmentId_learnerId: {
                    assessmentId: id,
                    learnerId: profile.id
                }
            },
            update: {
                fileUrl,
                submittedAt: new Date()
            },
            create: {
                assessmentId: id,
                learnerId: profile.id,
                fileUrl
            }
        });

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'SUBMIT_ASSESSMENT',
            entity: 'ASSIGNMENT_SUBMISSION',
            entityId: submission.id,
            details: { assessmentId: id }
        });

        return NextResponse.json(submission);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}
