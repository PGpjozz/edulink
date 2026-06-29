import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLearnersForSubject } from '@/lib/staff-context';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { id: subjectId } = await params;

    try {
        const learners = await getLearnersForSubject(auth, subjectId);
        return NextResponse.json(learners);
    } catch (error) {
        console.error('Error fetching learners:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
