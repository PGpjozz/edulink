import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const myBookings = searchParams.get('myBookings') === 'true';

        let where: any = {
            asset: { schoolId: session.user.schoolId as string }
        };

        if (myBookings) {
            where.userId = session.user.id;
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
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { assetId, startDate, endDate } = await req.json();

        // 1. Verify asset exists, is in same school, and is bookable
        const asset = await prisma.asset.findUnique({
            where: { id: assetId }
        });

        if (!asset || asset.schoolId !== session.user.schoolId || !asset.isBookable) {
            return NextResponse.json({ error: 'Asset not found or not bookable' }, { status: 400 });
        }

        // 2. Create the booking
        const booking = await prisma.assetBooking.create({
            data: {
                assetId,
                userId: session.user.id,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                status: 'PENDING'
            }
        });

        return NextResponse.json(booking);
    } catch (error) {
        console.error('Error creating booking:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PRINCIPAL') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id, status } = await req.json();

        const booking = await prisma.assetBooking.update({
            where: { id },
            data: { status },
            include: { asset: true }
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
