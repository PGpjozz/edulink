import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const subjectId = params.id;

    try {
        // 1. Get Subject to find Grade/School (but Subject doesn't strictly link to ONE class in schema?
        // Wait, Schema: Subject -> Grade (String). 
        // Teacher Assigned to Subject.
        // Class -> Grade (String).
        // The link is via Grade + School.
        // Or if we assume 1 Subject per Class (e.g. Maths 8A), then Subject needs a `classId`?
        // Current Schema: Subject has `grade`. Class has `grade`.
        // So "Mathematics Grade 8" applies to all Grade 8 classes?
        // Usually, a teacher teaches "Maths 8A".
        // If the schema is generic (Subject "Maths" for Grade "8"), then we fetch ALL Grade 8 learners?
        // Let's assume for now we look for learners in classes matching the subject's grade.

        // Improved Schema needed: Subject should probably optionally link to a Class if it's class-specific, 
        // or we have a `ClassSubject` pivot.
        // Given current schema: Subject(id, name, grade).
        // Application Logic: Fetch all learners in Classes that have `grade` == Subject.grade.

        const subject = await prisma.subject.findUnique({
            where: { id: subjectId }
        });

        if (!subject) return new NextResponse('Subject not found', { status: 404 });

        const learners = await prisma.learnerProfile.findMany({
            where: {
                class: {
                    grade: subject.grade, // Match grade
                    schoolId: session.user.schoolId
                }
            },
            include: {
                user: { select: { firstName: true, lastName: true, idNumber: true } }
            },
            orderBy: { user: { lastName: 'asc' } }
        });

        return NextResponse.json(learners);
    } catch (error) {
        console.error('Error fetching learners:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
