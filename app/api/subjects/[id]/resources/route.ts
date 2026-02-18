import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const { id } = await params;

        const subject = await prisma.subject.findFirst({
            where: { id, schoolId: auth.schoolId as string },
            select: { id: true }
        });

        if (!subject) {
            return new NextResponse('Subject not found', { status: 404 });
        }

        const resources = await prisma.resource.findMany({
            where: { subjectId: id },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(resources);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth({ roles: ['TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const { id } = await params;

        const subject = await prisma.subject.findFirst({
            where: { id, schoolId: auth.schoolId as string },
            select: { id: true, teacherId: true }
        });

        if (!subject) {
            return new NextResponse('Subject not found', { status: 404 });
        }

        if (auth.role === 'TEACHER') {
            const teacherProfile = await prisma.teacherProfile.findUnique({
                where: { userId: auth.userId },
                select: { id: true }
            });

            if (!teacherProfile || subject.teacherId !== teacherProfile.id) {
                return new NextResponse('Forbidden', { status: 403 });
            }
        }

        const body = await readJson<{ title?: string; fileUrl?: string; fileType?: string; fileSize?: number }>(req);
        if (body instanceof NextResponse) return body;
        const { title, fileUrl, fileType, fileSize } = body;

        if (!title || !fileUrl) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const resource = await prisma.resource.create({
            data: {
                subjectId: id,
                title,
                fileUrl,
                fileType: fileType || 'OTHER',
                fileSize
            }
        });

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'CREATE_RESOURCE',
            entity: 'RESOURCE',
            entityId: resource.id,
            details: { subjectId: id, title }
        });

        return NextResponse.json(resource);
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 });
    }
}
