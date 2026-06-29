import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';
import { canManageUsers, PERMISSION_KEYS } from '@/lib/permissions';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    if (!canManageUsers(auth)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: userId } = await params;
    const body = await readJson<{ permissions?: string[] }>(req);
    if (body instanceof NextResponse) return body;

    const user = await prisma.user.findFirst({
        where: { id: userId, schoolId: auth.schoolId! },
        select: { id: true, role: true },
    });
    if (!user) return new NextResponse('Not found', { status: 404 });

    if (['SCHOOL_OWNER', 'PRINCIPAL', 'PROVIDER'].includes(user.role)) {
        return NextResponse.json({ error: 'Cannot override permissions for this role' }, { status: 400 });
    }

    const permissions = (body.permissions ?? []).filter((p) =>
        (PERMISSION_KEYS as readonly string[]).includes(p)
    );

    const updated = await prisma.user.update({
        where: { id: userId },
        data: { permissions },
        select: { id: true, permissions: true, role: true },
    });

    await writeAuditLog({
        schoolId: auth.schoolId,
        userId: auth.userId,
        action: 'UPDATE_PERMISSIONS',
        entity: 'USER',
        entityId: userId,
        details: { permissions },
    });

    return NextResponse.json(updated);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { id: userId } = await params;

    const user = await prisma.user.findFirst({
        where: { id: userId, schoolId: auth.schoolId! },
        select: { id: true, role: true, permissions: true, firstName: true, lastName: true },
    });
    if (!user) return new NextResponse('Not found', { status: 404 });

    return NextResponse.json(user);
}
