import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';
import { createImpersonationToken } from '@/lib/impersonation-token';

export async function POST(req: Request) {
    const auth = await requireAuth({ roles: ['PROVIDER'] });
    if (auth instanceof NextResponse) return auth;

    const body = await readJson<{ userId?: string; schoolId?: string }>(req);
    if (body instanceof NextResponse) return body;

    let targetUserId = body.userId;

    if (!targetUserId && body.schoolId) {
        const owner = await prisma.user.findFirst({
            where: { schoolId: body.schoolId, role: 'SCHOOL_OWNER', isActive: true },
            select: { id: true },
        });
        const principal =
            owner ??
            (await prisma.user.findFirst({
                where: { schoolId: body.schoolId, role: 'PRINCIPAL', isActive: true },
                select: { id: true },
            }));
        if (!principal) {
            return NextResponse.json({ error: 'No school admin found to impersonate' }, { status: 404 });
        }
        targetUserId = principal.id;
    }

    if (!targetUserId) {
        return NextResponse.json({ error: 'userId or schoolId required' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, email: true, role: true, schoolId: true, school: { select: { name: true } } },
    });

    if (!target || target.role === 'PROVIDER') {
        return NextResponse.json({ error: 'Cannot impersonate this user' }, { status: 403 });
    }

    const token = createImpersonationToken(auth.userId, target.id);

    await writeAuditLog({
        schoolId: target.schoolId,
        userId: auth.userId,
        action: 'IMPERSONATE_USER',
        entity: 'USER',
        entityId: target.id,
        details: { targetEmail: target.email, targetRole: target.role },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

    return NextResponse.json({
        ok: true,
        impersonationToken: token,
        impersonateUrl: `${baseUrl}/auth/impersonate?token=${encodeURIComponent(token)}`,
        target: {
            id: target.id,
            email: target.email,
            role: target.role,
            schoolName: target.school?.name,
        },
    });
}
