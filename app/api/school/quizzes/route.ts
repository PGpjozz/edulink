import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get('subjectId');

    try {
        const quizzes = await prisma.quiz.findMany({
            where: {
                subjectId: subjectId || undefined,
                subject: {
                    schoolId: session.user.schoolId as string,
                    // If teacher, they might only see their subjects
                    teacherId: session.user.role === 'TEACHER' ? session.user.id : undefined
                }
            },
            include: {
                _count: { select: { questions: true, attempts: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(quizzes);
    } catch (error) {
        console.error('Quiz GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'TEACHER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { title, description, subjectId, timeLimit, questions } = await req.json();

        // Create quiz with nested questions and options
        const quiz = await prisma.quiz.create({
            data: {
                title,
                description,
                subjectId,
                timeLimit: timeLimit ? parseInt(timeLimit) : null,
                questions: {
                    create: questions.map((q: any) => ({
                        text: q.text,
                        points: q.points || 1,
                        options: {
                            create: q.options.map((o: any) => ({
                                text: o.text,
                                isCorrect: o.isCorrect
                            }))
                        }
                    }))
                }
            },
            include: {
                questions: {
                    include: { options: true }
                }
            }
        });

        return NextResponse.json(quiz);
    } catch (error) {
        console.error('Quiz POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
