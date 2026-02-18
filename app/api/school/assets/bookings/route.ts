import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, readJson, writeAuditLog } from '@/lib/api-auth';

export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const { searchParams } = new URL(req.url);
        const myBookings = searchParams.get('myBookings') === 'true';

        let where: any = { asset: { schoolId: auth.schoolId as string } };

        const staff = ['PRINCIPAL', 'SCHOOL_ADMIN', 'TEACHER'].includes(auth.role);

        if (myBookings || !staff) {
            where.userId = auth.userId;
        }

        const bookings = await prisma.assetBooking.findMany({
            where,
            include: {
                asset: true,
                user: { select: { firstName: true, lastName: true, role: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireAuth({ roles: ['LEARNER'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{ assetId?: string; startDate?: string; endDate?: string }>(req);
        if (body instanceof NextResponse) return body;
        const { assetId, startDate, endDate } = body;

        if (!assetId || !startDate || !endDate) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
            return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
        }

        // 1. Verify asset exists, is in same school, and is bookable
        const asset = await prisma.asset.findFirst({
            where: { id: assetId, schoolId: auth.schoolId as string },
            select: { id: true, isBookable: true, status: true }
        });

        if (!asset || !asset.isBookable || asset.status !== 'AVAILABLE') {
            return NextResponse.json({ error: 'Asset not found or not bookable' }, { status: 400 });
        }

        // 2. Create the booking
        const booking = await prisma.assetBooking.create({
            data: {
                assetId,
                userId: auth.userId,
                startDate: start,
                endDate: end,
                status: 'PENDING'
            }
        });

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'CREATE_ASSET_BOOKING',
            entity: 'ASSET_BOOKING',
            entityId: booking.id,
            details: { assetId, startDate, endDate }
        });

        return NextResponse.json(booking);
    } catch (error) {
        console.error('Error creating booking:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const auth = await requireAuth({ roles: ['PRINCIPAL', 'SCHOOL_ADMIN'], requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    try {
        const body = await readJson<{ id?: string; status?: string }>(req);
        if (body instanceof NextResponse) return body;
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const existing = await prisma.assetBooking.findFirst({
            where: { id, asset: { schoolId: auth.schoolId as string } },
            select: { id: true }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        const booking = await prisma.assetBooking.update({
            where: { id },
            data: { status: status as any },
            include: { asset: true }
        });

        await writeAuditLog({
            schoolId: auth.schoolId,
            userId: auth.userId,
            action: 'UPDATE_ASSET_BOOKING',
            entity: 'ASSET_BOOKING',
            entityId: booking.id,
            details: { status }
        });

        // If approved, maybe update the asset status too?
        // Actually, 'BOOKED' might be a good status for Assets.
        // Let's stick to simple booking for now.

        return NextResponse.json(booking);
    } catch (error) {
        console.error('Error updating booking:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
