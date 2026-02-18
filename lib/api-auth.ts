import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RequireAuthOptions = {
    roles?: string[];
    requireSchoolId?: boolean;
};

export type AuthContext = {
    session: any;
    userId: string;
    role: string;
    schoolId: string | null;
};

export async function requireAuth(options: RequireAuthOptions = {}): Promise<AuthContext | NextResponse> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.role) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = String(session.user.role);
    const schoolId = session.user.schoolId ? String(session.user.schoolId) : null;

    if (options.roles && !options.roles.includes(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (options.requireSchoolId && !schoolId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return {
        session,
        userId: String(session.user.id),
        role,
        schoolId,
    };
}

export async function readJson<T = any>(req: Request): Promise<T | NextResponse> {
    try {
        return (await req.json()) as T;
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
}

export async function writeAuditLog(params: {
    schoolId?: string | null;
    userId?: string | null;
    action: string;
    entity: string;
    entityId: string;
    details?: any;
}): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                schoolId: params.schoolId ?? null,
                userId: params.userId ?? null,
                action: params.action,
                entity: params.entity,
                entityId: params.entityId,
                details: params.details,
            },
        });
    } catch (error) {
        console.error('AuditLog write failed:', error);
    }
}
