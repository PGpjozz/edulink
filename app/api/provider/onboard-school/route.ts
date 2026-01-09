import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'PROVIDER') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await req.json();
        const {
            schoolName,
            tier,
            monthlyFee,
            contactEmail,
            principalFirstName,
            principalLastName,
            principalEmail,
            principalPassword
        } = body;

        // Check if principal email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: principalEmail }
        });

        if (existingUser) {
            return NextResponse.json({ error: 'Principal email already exists' }, { status: 400 });
        }

        // Hash principal password
        const hashedPassword = await bcrypt.hash(principalPassword, 10);

        // Create school and principal in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create School
            const school = await tx.school.create({
                data: {
                    name: schoolName,
                    tier,
                    monthlyFee: parseFloat(monthlyFee),
                    contactEmail,
                    isActive: true,
                    gradesOffered: ['8', '9', '10', '11', '12']
                }
            });

            // Create Principal User
            const principal = await tx.user.create({
                data: {
                    email: principalEmail,
                    password: hashedPassword,
                    firstName: principalFirstName,
                    lastName: principalLastName,
                    role: 'PRINCIPAL',
                    schoolId: school.id,
                    isActive: true
                }
            });

            // Create audit log
            await tx.auditLog.create({
                data: {
                    schoolId: school.id,
                    userId: session.user.id,
                    action: 'Onboard School',
                    entity: 'School',
                    entityId: school.id,
                    details: {
                        schoolName,
                        principalEmail,
                        tier
                    }
                }
            });

            return { school, principal };
        });

        return NextResponse.json({
            success: true,
            school: result.school,
            principal: {
                id: result.principal.id,
                email: result.principal.email
            }
        });
    } catch (error) {
        console.error('Error onboarding school:', error);
        return NextResponse.json({ error: 'Failed to onboard school' }, { status: 500 });
    }
}
