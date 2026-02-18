import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';
import type { AssetStatus } from '@prisma/client';

export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const bookableOnly = searchParams.get('bookableOnly') === 'true';

    if (bookableOnly) {
        if (!['LEARNER', 'TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN'].includes(auth.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
    } else {
        if (!['PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER'].includes(auth.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
    }

    try {
        const assets = await prisma.asset.findMany({
            where: {
                schoolId: auth.schoolId as string,
                ...(bookableOnly ? { isBookable: true, status: 'AVAILABLE' } : {})
            },
            include: {
                assignedTo: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(assets);
    } catch (error) {
        console.error('Error fetching assets:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireAuth({ roles: ['PRINCIPAL', 'SCHOOL_ADMIN'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{ name?: string; category?: string; identifier?: string; isBookable?: boolean; replacementPrice?: number }>(req);
        if (body instanceof NextResponse) return body;
        const { name, category, identifier, isBookable, replacementPrice } = body;

        if (!name || !category || !identifier) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const replacementPriceNum = replacementPrice === undefined || replacementPrice === null ? 0 : Number(replacementPrice);
        if (!Number.isFinite(replacementPriceNum) || replacementPriceNum < 0) {
            return NextResponse.json({ error: 'Invalid replacementPrice' }, { status: 400 });
        }

        const asset = await prisma.asset.create({
            data: {
                name,
                category,
                identifier,
                schoolId: auth.schoolId as string,
                status: 'AVAILABLE',
                isBookable: isBookable === undefined ? true : Boolean(isBookable),
                replacementPrice: replacementPriceNum
            }
        });

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'CREATE_ASSET',
            entity: 'ASSET',
            entityId: asset.id,
            details: { name, category, identifier }
        });

        return NextResponse.json(asset);
    } catch (error) {
        console.error('Error creating asset:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const auth = await requireAuth({ roles: ['PRINCIPAL', 'SCHOOL_ADMIN'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{
            id?: string;
            status?: AssetStatus;
            assignedToId?: string | null;
            isBookable?: boolean;
            replacementPrice?: number;
        }>(req);
        if (body instanceof NextResponse) return body;
        const { id, status, assignedToId, isBookable, replacementPrice } = body;

        if (!id || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!['AVAILABLE', 'CHECKED_OUT', 'MAINTENANCE', 'LOST'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const existing = await prisma.asset.findFirst({
            where: { id, schoolId: auth.schoolId as string },
            select: { id: true, assignedToId: true, status: true, replacementPrice: true, name: true, identifier: true }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }

        const data: any = {};

        if (isBookable !== undefined) {
            data.isBookable = Boolean(isBookable);
        }

        if (replacementPrice !== undefined && replacementPrice !== null) {
            const replacementPriceNum = Number(replacementPrice);
            if (!Number.isFinite(replacementPriceNum) || replacementPriceNum < 0) {
                return NextResponse.json({ error: 'Invalid replacementPrice' }, { status: 400 });
            }
            data.replacementPrice = replacementPriceNum;
        }

        if (status === 'CHECKED_OUT') {
            if (!assignedToId) {
                return NextResponse.json({ error: 'assignedToId required' }, { status: 400 });
            }

            const assignee = await prisma.user.findFirst({
                where: {
                    id: assignedToId,
                    schoolId: auth.schoolId as string,
                    role: 'LEARNER',
                    isActive: true
                },
                select: { id: true }
            });

            if (!assignee) {
                return NextResponse.json({ error: 'Invalid assignee' }, { status: 400 });
            }

            data.status = 'CHECKED_OUT' as AssetStatus;
            data.assignedToId = assignedToId;
        } else if (status === 'AVAILABLE') {
            data.status = 'AVAILABLE' as AssetStatus;
            data.assignedToId = null;
        } else if (status === 'MAINTENANCE') {
            data.status = 'MAINTENANCE' as AssetStatus;
        } else if (status === 'LOST') {
            if (!existing.assignedToId) {
                return NextResponse.json({ error: 'Asset is not checked out' }, { status: 400 });
            }

            const learnerProfile = await prisma.learnerProfile.findUnique({
                where: { userId: existing.assignedToId },
                select: { id: true }
            });

            if (!learnerProfile) {
                return NextResponse.json({ error: 'Assigned user is not a learner' }, { status: 400 });
            }

            const price = existing.replacementPrice;
            if (!Number.isFinite(price) || price <= 0) {
                return NextResponse.json({ error: 'replacementPrice must be set to mark lost' }, { status: 400 });
            }

            const invoiceTitle = `Replacement Charge - ${existing.name} (${existing.identifier ?? existing.id}) [${existing.id}]`;
            const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

            const existingInvoice = await prisma.feeInvoice.findFirst({
                where: {
                    schoolId: auth.schoolId as string,
                    learnerId: learnerProfile.id,
                    title: invoiceTitle,
                    status: { in: ['PENDING', 'OVERDUE'] }
                },
                select: { id: true }
            });

            const result = await prisma.$transaction(async (tx) => {
                const updated = await tx.asset.update({
                    where: { id },
                    data: {
                        ...data,
                        status: 'LOST' as AssetStatus
                    }
                });

                let invoiceId: string | null = existingInvoice?.id ?? null;
                if (!invoiceId) {
                    const invoice = await tx.feeInvoice.create({
                        data: {
                            schoolId: auth.schoolId as string,
                            learnerId: learnerProfile.id,
                            title: invoiceTitle,
                            amount: price,
                            dueDate,
                            status: 'PENDING'
                        }
                    });
                    invoiceId = invoice.id;
                }

                return { updated, invoiceId };
            });

            await writeAuditLog({
                schoolId: auth.schoolId,
                userId: auth.userId,
                action: 'MARK_ASSET_LOST',
                entity: 'ASSET',
                entityId: id,
                details: { invoiceId: result.invoiceId, assignedToId: existing.assignedToId, replacementPrice: price }
            });

            return NextResponse.json(result.updated);
        }

        const asset = await prisma.asset.update({
            where: { id },
            data: {
                ...data,
                status,
                assignedToId: status === 'AVAILABLE' ? null : status === 'CHECKED_OUT' ? assignedToId : existing.assignedToId
            }
        });

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'UPDATE_ASSET',
            entity: 'ASSET',
            entityId: asset.id,
            details: { status: asset.status, assignedToId: asset.assignedToId, replacementPrice: asset.replacementPrice, isBookable: asset.isBookable }
        });

        return NextResponse.json(asset);
    } catch (error) {
        console.error('Error updating asset:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const auth = await requireAuth({ roles: ['PRINCIPAL', 'SCHOOL_ADMIN'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }

        const existing = await prisma.asset.findFirst({
            where: { id, schoolId: auth.schoolId as string },
            select: { id: true }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }

        await prisma.asset.delete({
            where: { id }
        });

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'DELETE_ASSET',
            entity: 'ASSET',
            entityId: id,
            details: {}
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting asset:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
