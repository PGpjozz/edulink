import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/api-auth';
import { getTuitionFee } from '@/lib/subscription';

const FEE_ROLES = ['SCHOOL_OWNER', 'PRINCIPAL', 'SCHOOL_ADMIN'];

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || !FEE_ROLES.includes(session.user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const school = await prisma.school.findUnique({
        where: { id: session.user.schoolId },
        select: { tuitionFee: true, monthlyFee: true },
    });

    if (!school) {
        return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    return NextResponse.json({
        tuitionFee: getTuitionFee(school),
        configuredTuitionFee: school.tuitionFee,
    });
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.schoolId || !FEE_ROLES.includes(session.user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const tuitionFee = Number(body.tuitionFee);

    if (!Number.isFinite(tuitionFee) || tuitionFee < 0) {
        return NextResponse.json({ error: 'Invalid tuition fee' }, { status: 400 });
    }

    const updated = await prisma.school.update({
        where: { id: session.user.schoolId },
        data: { tuitionFee },
        select: { tuitionFee: true },
    });

    await writeAuditLog({
        schoolId: session.user.schoolId,
        userId: session.user.id,
        action: 'UPDATE_TUITION_FEE',
        entity: 'SCHOOL',
        entityId: session.user.schoolId,
        details: { tuitionFee },
    });

    return NextResponse.json({
        tuitionFee: getTuitionFee(updated),
        configuredTuitionFee: updated.tuitionFee,
    });
}
