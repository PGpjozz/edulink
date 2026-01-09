import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const assessmentId = searchParams.get('assessmentId');

    if (!assessmentId) {
        return new NextResponse('Assessment ID required', { status: 400 });
    }

    try {
        const grades = await prisma.grade.findMany({
            where: {
                assessmentId,
                assessment: { subject: { schoolId: session.user.schoolId } }
            },
            include: {
                learner: {
                    include: { user: { select: { firstName: true, lastName: true, idNumber: true } } }
                }
            }
        });

        return NextResponse.json(grades);
    } catch (error) {
        console.error('Error fetching grades:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // Teachers/Admins can grade
    if (!['TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN'].includes(session.user.role)) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    try {
        const body = await req.json();
        const { assessmentId, grades } = body; // grades: [{ learnerId, score, comments }]

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
                            score: parseFloat(g.score),
                            comments: g.comments
                        },
                        create: {
                            assessmentId,
                            learnerId: g.learnerId,
                            score: parseFloat(g.score),
                            comments: g.comments
                        }
                    })
                )
            );

            // Log the action
            await tx.auditLog.create({
                data: {
                    schoolId: session.user.schoolId as string,
                    userId: session.user.id,
                    action: 'Update Grades',
                    entity: 'Assessment',
                    entityId: assessmentId,
                    details: { learnerCount: grades.length }
                }
            });

            return upserts;
        });

        return NextResponse.json(results);
    } catch (error) {
        console.error('Error saving grades:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
