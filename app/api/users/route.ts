import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET: Fetch users (Teachers, Learners, Admins)
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const users = await prisma.user.findMany({
            where: {
                schoolId: session.user.schoolId,
                role: { not: 'PROVIDER' }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                isActive: true
            },
            orderBy: { role: 'asc' }
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

// POST: Create a new user (Invite)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId || session.user.role !== 'PRINCIPAL') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const { firstName, lastName, email, role, idNumber } = body;

        const hashedPassword = await bcrypt.hash('password123', 10); // Default password

        const user = await prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                idNumber, // Optional for some roles, required for learner
                password: hashedPassword,
                role,
                schoolId: session.user.schoolId,
                isActive: true,
                // Create profile based on role
                ...(role === 'LEARNER' && {
                    learnerProfile: { create: {} }
                }),
                ...(role === 'TEACHER' && {
                    teacherProfile: { create: {} }
                }),
                ...(role === 'PRINCIPAL' && {
                    // Principal logic if needed
                })
            }
        });

        return NextResponse.json({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role
        });
    } catch (error) {
        console.error('Error creating user:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
