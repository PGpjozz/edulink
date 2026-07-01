export interface ClassData {
    id: string;
    name: string;
    grade: string;
    _count: { learners: number };
    teacher?: { user: { firstName: string; lastName: string } };
    teacherProfileId?: string | null;
}

export interface UserData {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    idNumber?: string | null;
    role: string;
    isActive: boolean;
    teacherProfileId?: string | null;
}

export interface SubjectData {
    id: string;
    name: string;
    code?: string | null;
    grade: string;
    teacherId?: string | null;
    teacher?: { user: { firstName: string; lastName: string } } | null;
}

export type OverviewResponse = {
    lastUpdated: string;
    kpis: {
        learners: number;
        teachers: number;
        parents: number;
        staff: number;
        classes: number;
        classesUnassigned: number;
        subjects: number;
        subjectsUnassigned: number;
        assets: {
            total: number;
            available: number;
            checkedOut: number;
            maintenance: number;
            lost: number;
        };
        bookingsPending: number;
        invoices: {
            pendingAmount: number;
            overdueAmount: number;
            pendingCount: number;
            overdueCount: number;
            dueSoonCount: number;
        };
    };
    recent: {
        invoices: Array<{
            id: string;
            title: string;
            amount: number;
            status: string;
            dueDate: string;
            createdAt: string;
            learnerName: string;
        }>;
        bookings: Array<{
            id: string;
            status: string;
            startDate: string;
            endDate: string;
            createdAt: string;
            assetName: string;
            assetIdentifier: string;
            userName: string;
            userRole: string;
        }>;
        behavior: Array<{
            id: string;
            type: string;
            category: string;
            points: number;
            reason: string;
            createdAt: string;
            learnerName: string;
            teacherName: string;
        }>;
    };
};

export type TeacherOption = { teacherProfileId: string; name: string };

export type HodCandidate = { userId: string; name: string; role: string };
