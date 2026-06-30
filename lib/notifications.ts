import { prisma } from '@/lib/prisma';
import type { NotificationType, Prisma } from '@prisma/client';

export interface CreateNotificationInput {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    link?: string | null;
}

export async function createNotification(input: CreateNotificationInput) {
    return prisma.notification.create({
        data: {
            userId: input.userId,
            title: input.title,
            message: input.message,
            type: input.type,
            link: input.link ?? null,
        },
    });
}

export async function createNotifications(inputs: CreateNotificationInput[]) {
    if (inputs.length === 0) return { count: 0 };
    return prisma.notification.createMany({ data: inputs });
}

export async function getAnnouncementRecipientIds(
    schoolId: string,
    audience: string,
    grade?: string | null,
    classId?: string | null,
): Promise<string[]> {
    const where: Prisma.UserWhereInput = { schoolId, isActive: true };

    switch (audience) {
        case 'SCHOOL':
            where.role = { in: ['LEARNER', 'PARENT', 'TEACHER', 'HOD', 'PRINCIPAL', 'SCHOOL_ADMIN'] };
            break;
        case 'PARENTS':
            where.role = 'PARENT';
            break;
        case 'LEARNERS':
            where.role = 'LEARNER';
            break;
        case 'GRADE':
            if (!grade) return [];
            {
                const learners = await prisma.learnerProfile.findMany({
                    where: { grade },
                    select: { userId: true, parentIds: true },
                });
                const parentIds = learners.flatMap((l) => l.parentIds);
                const learnerUserIds = learners.map((l) => l.userId);
                return [...new Set([...learnerUserIds, ...parentIds])];
            }
        case 'CLASS':
            if (!classId) return [];
            {
                const learners = await prisma.learnerProfile.findMany({
                    where: { classId },
                    select: { userId: true, parentIds: true },
                });
                const parentIds = learners.flatMap((l) => l.parentIds);
                const learnerUserIds = learners.map((l) => l.userId);
                return [...new Set([...learnerUserIds, ...parentIds])];
            }
        default:
            return [];
    }

    const users = await prisma.user.findMany({ where, select: { id: true } });
    return users.map((u) => u.id);
}
