import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.schoolId || session.user.role !== 'LEARNER') {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        // Get all learners with their behavior points
        const learners = await prisma.learnerProfile.findMany({
            where: {
                class: {
                    schoolId: session.user.schoolId
                }
            },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true }
                },
                behaviorRecords: true
            }
        });

        // Calculate total points for each learner
        const leaderboard = learners.map(learner => ({
            id: learner.id,
            name: `${learner.user.firstName} ${learner.user.lastName}`,
            grade: learner.grade,
            points: learner.behaviorRecords.reduce((sum, record) => sum + record.points, 0)
        }))
            .sort((a, b) => b.points - a.points)
            .slice(0, 50); // Top 50

        // Find current learner's rank
        const myProfile = await prisma.learnerProfile.findFirst({
            where: { userId: session.user.id },
            include: {
                user: { select: { firstName: true, lastName: true } },
                behaviorRecords: true
            }
        });

        const myPoints = myProfile?.behaviorRecords.reduce((sum, r) => sum + r.points, 0) || 0;
        const myRankIndex = leaderboard.findIndex(l => l.id === myProfile?.id);

        return NextResponse.json({
            leaderboard,
            myRank: myProfile ? {
                rank: myRankIndex + 1,
                name: `${myProfile.user.firstName} ${myProfile.user.lastName}`,
                points: myPoints
            } : null
        });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
