import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    try {
        // Teachers see all submissions for assessment, Learners see only their own
        const where: any = { assessmentId: params.id };
        if (session.user.role === 'LEARNER') {
            const profile = await prisma.learnerProfile.findUnique({ where: { userId: session.user.id } });
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

export async function POST(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'LEARNER') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const { fileUrl } = body;

        const profile = await prisma.learnerProfile.findUnique({ where: { userId: session.user.id } });
        if (!profile) return new NextResponse('Learner profile not found', { status: 404 });

        const submission = await prisma.assignmentSubmission.upsert({
            where: {
                assessmentId_learnerId: {
                    assessmentId: params.id,
                    learnerId: profile.id
                }
            },
            update: {
                fileUrl,
                submittedAt: new Date()
            },
            create: {
                assessmentId: params.id,
                learnerId: profile.id,
                fileUrl
            }
        });

        return NextResponse.json(submission);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}
