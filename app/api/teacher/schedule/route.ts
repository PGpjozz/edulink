import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { buildTeacherSchedule } from '@/lib/teacher-schedule';

export async function GET() {
    const auth = await requireAuth({ roles: ['TEACHER', 'HOD'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const slots = await buildTeacherSchedule(auth);
        return NextResponse.json({ slots });
    } catch (error) {
        console.error('Teacher schedule error:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
