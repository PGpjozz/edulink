import { prisma } from './prisma';
import type { AuthContext } from './api-auth';
import { canManageSchool } from './permissions';

export type StaffContext = {
    teacherProfileId: string | null;
    departmentIdsLed: string[];
    departmentId: string | null;
    assignedSubjectIds: string[];
    classSubjectIds: string[];
    formClassIds: string[];
    learnerIds: string[];
    classIds: string[];
};

const emptyContext = (): StaffContext => ({
    teacherProfileId: null,
    departmentIdsLed: [],
    departmentId: null,
    assignedSubjectIds: [],
    classSubjectIds: [],
    formClassIds: [],
    learnerIds: [],
    classIds: [],
});

const staffContextCache = new Map<string, { at: number; ctx: StaffContext }>();
const CACHE_TTL_MS = 30_000;

export async function getStaffContext(auth: AuthContext): Promise<StaffContext> {
    if (!auth.schoolId) return emptyContext();

    const cacheKey = `${auth.userId}:${auth.role}`;
    const cached = staffContextCache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
        return cached.ctx;
    }

    const departmentsLed = await prisma.department.findMany({
        where: { schoolId: auth.schoolId, hodUserId: auth.userId },
        select: { id: true, subjects: { select: { id: true } } },
    });
    const deptSubjectIds = departmentsLed.flatMap((d) => d.subjects.map((s) => s.id));

    const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: auth.userId },
        select: {
            id: true,
            departmentId: true,
            assignedSubjects: { select: { id: true } },
            managedClasses: { select: { id: true, learners: { select: { id: true } } } },
            classSubjects: {
                select: {
                    id: true,
                    classId: true,
                    subjectId: true,
                    class: { select: { learners: { select: { id: true } } } },
                },
            },
        },
    });

    if (!teacherProfile && departmentsLed.length === 0 && canManageSchool(auth.role)) {
        const ctx = emptyContext();
        staffContextCache.set(cacheKey, { at: Date.now(), ctx });
        return ctx;
    }

    const assignedSubjectIds = [
        ...new Set([
            ...(teacherProfile?.assignedSubjects.map((s) => s.id) ?? []),
            ...(teacherProfile?.classSubjects.map((cs) => cs.subjectId) ?? []),
            ...deptSubjectIds,
        ]),
    ];

    const formClassIds = teacherProfile?.managedClasses.map((c) => c.id) ?? [];
    const classIds = [
        ...new Set([
            ...formClassIds,
            ...(teacherProfile?.classSubjects.map((cs) => cs.classId) ?? []),
        ]),
    ];

    const learnerIds = [
        ...new Set([
            ...(teacherProfile?.managedClasses.flatMap((c) => c.learners.map((l) => l.id)) ?? []),
            ...(teacherProfile?.classSubjects.flatMap((cs) => cs.class.learners.map((l) => l.id)) ?? []),
        ]),
    ];

    const ctx: StaffContext = {
        teacherProfileId: teacherProfile?.id ?? null,
        departmentIdsLed: departmentsLed.map((d) => d.id),
        departmentId: teacherProfile?.departmentId ?? null,
        assignedSubjectIds,
        classSubjectIds: teacherProfile?.classSubjects.map((cs) => cs.id) ?? [],
        formClassIds,
        learnerIds,
        classIds,
    };

    staffContextCache.set(cacheKey, { at: Date.now(), ctx });
    return ctx;
}

export async function canAccessSubject(auth: AuthContext, subjectId: string): Promise<boolean> {
    if (canManageSchool(auth.role)) return true;
    const ctx = await getStaffContext(auth);
    return ctx.assignedSubjectIds.includes(subjectId);
}

export async function canAccessClass(auth: AuthContext, classId: string): Promise<boolean> {
    if (canManageSchool(auth.role)) return true;
    const ctx = await getStaffContext(auth);
    if (ctx.classIds.includes(classId)) return true;
    if (auth.role === 'HOD' && ctx.departmentIdsLed.length > 0) {
        const count = await prisma.classSubject.count({
            where: {
                classId,
                subject: { departmentId: { in: ctx.departmentIdsLed } },
            },
        });
        return count > 0;
    }
    return false;
}

export async function canAccessLearner(auth: AuthContext, learnerId: string): Promise<boolean> {
    if (canManageSchool(auth.role)) return true;
    const ctx = await getStaffContext(auth);
    if (ctx.learnerIds.includes(learnerId)) return true;
    if (auth.role === 'HOD' && ctx.departmentIdsLed.length > 0) {
        const learner = await prisma.learnerProfile.findFirst({
            where: {
                id: learnerId,
                user: { schoolId: auth.schoolId! },
                class: {
                    classSubjects: {
                        some: { subject: { departmentId: { in: ctx.departmentIdsLed } } },
                    },
                },
            },
            select: { id: true },
        });
        return !!learner;
    }
    return false;
}

export function subjectScopeWhere(auth: AuthContext, ctx: StaffContext) {
    if (canManageSchool(auth.role)) {
        return { schoolId: auth.schoolId! };
    }
    if (auth.role === 'HOD' && ctx.departmentIdsLed.length > 0) {
        return {
            schoolId: auth.schoolId!,
            OR: [
                { departmentId: { in: ctx.departmentIdsLed } },
                { id: { in: ctx.assignedSubjectIds } },
            ],
        };
    }
    if (ctx.assignedSubjectIds.length > 0) {
        return { schoolId: auth.schoolId!, id: { in: ctx.assignedSubjectIds } };
    }
    return { schoolId: auth.schoolId!, id: { in: [] as string[] } };
}

export function classScopeWhere(auth: AuthContext, ctx: StaffContext) {
    if (canManageSchool(auth.role)) {
        return { schoolId: auth.schoolId! };
    }
    if (ctx.classIds.length > 0) {
        return { schoolId: auth.schoolId!, id: { in: ctx.classIds } };
    }
    if (auth.role === 'HOD' && ctx.departmentIdsLed.length > 0) {
        return {
            schoolId: auth.schoolId!,
            classSubjects: {
                some: { subject: { departmentId: { in: ctx.departmentIdsLed } } },
            },
        };
    }
    return { schoolId: auth.schoolId!, id: { in: [] as string[] } };
}

export async function getLearnersForSubject(auth: AuthContext, subjectId: string) {
    const subject = await prisma.subject.findFirst({
        where: { id: subjectId, schoolId: auth.schoolId! },
        select: { id: true, grade: true },
    });
    if (!subject) return [];

    const ctx = await getStaffContext(auth);
    if (!canManageSchool(auth.role) && !ctx.assignedSubjectIds.includes(subjectId)) {
        return [];
    }

    return prisma.learnerProfile.findMany({
        where: {
            class: {
                schoolId: auth.schoolId!,
                classSubjects: {
                    some: {
                        subjectId,
                        ...(ctx.teacherProfileId && !canManageSchool(auth.role) && auth.role !== 'HOD'
                            ? { teacherProfileId: ctx.teacherProfileId }
                            : {}),
                    },
                },
            },
        },
        include: {
            user: { select: { firstName: true, lastName: true, idNumber: true, email: true } },
        },
        orderBy: { user: { lastName: 'asc' } },
    });
}
