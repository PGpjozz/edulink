import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { schoolId, firstName, lastName, email, grade, notes } = body;

        if (!schoolId || !firstName || !lastName || !email || !grade) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const application = await prisma.application.create({
            data: {
                schoolId,
                firstName,
                lastName,
                email,
                grade,
                notes,
                status: 'PENDING'
            }
        });

        return NextResponse.json(application);
    } catch (error) {
        console.error(error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
