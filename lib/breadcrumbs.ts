import { BreadcrumbItem } from '@/app/components/ui/PageHeader';

type CrumbResolver = (params: Record<string, string>) => BreadcrumbItem[];

const ROUTES: Record<string, BreadcrumbItem[] | CrumbResolver> = {
    '/dashboard/teacher/gradebook': [{ label: 'Gradebook' }],
    '/dashboard/teacher/homework': [
        { label: 'My Classroom', href: '/dashboard/teacher' },
        { label: 'Homework' },
    ],
    '/dashboard/teacher/behavior': [
        { label: 'My Classroom', href: '/dashboard/teacher' },
        { label: 'Behavior' },
    ],
    '/dashboard/teacher/class': (p) => [
        { label: 'My Classroom', href: '/dashboard/teacher' },
        { label: 'Class', href: `/dashboard/teacher/class/${p.id}/attendance` },
        { label: 'Attendance' },
    ],
    '/dashboard/teacher/subject': (p) => [
        { label: 'My Classroom', href: '/dashboard/teacher' },
        { label: 'Subject', href: `/dashboard/teacher/subject/${p.id}` },
    ],
    '/dashboard/teacher/assessment': (p) => [
        { label: 'My Classroom', href: '/dashboard/teacher' },
        { label: 'Subject', href: `/dashboard/teacher/subject/${p.subjectId}` },
        { label: 'Grading' },
    ],
    '/dashboard/principal/classes': [
        { label: 'School Management', href: '/dashboard/principal' },
        { label: 'Classes' },
    ],
    '/dashboard/principal/users': [
        { label: 'School Management', href: '/dashboard/principal' },
        { label: 'Staff' },
    ],
    '/dashboard/principal/subjects': [
        { label: 'School Management', href: '/dashboard/principal' },
        { label: 'Subjects' },
    ],
    '/dashboard/principal/departments': [
        { label: 'School Management', href: '/dashboard/principal' },
        { label: 'Departments' },
    ],
    '/dashboard/messages': [{ label: 'Messages' }],
    '/dashboard/announcements': [{ label: 'Announcements' }],
    '/dashboard/learner/homework': [
        { label: 'My Progress', href: '/dashboard/learner' },
        { label: 'Homework' },
    ],
};

export function getBreadcrumbs(pathname: string, params: Record<string, string> = {}): BreadcrumbItem[] {
    if (pathname.match(/\/dashboard\/teacher\/gradebook\/[^/]+$/)) {
        return [
            { label: 'Gradebook', href: '/dashboard/teacher/gradebook' },
            { label: 'Subject grades' },
        ];
    }
    if (pathname.match(/\/dashboard\/teacher\/subject\/[^/]+\/assessment\/[^/]+$/)) {
        const subjectId = params.id ?? pathname.split('/')[4];
        return [
            { label: 'My Classroom', href: '/dashboard/teacher' },
            { label: 'Subject', href: `/dashboard/teacher/subject/${subjectId}` },
            { label: 'Grading' },
        ];
    }
    if (pathname.match(/\/dashboard\/teacher\/subject\/[^/]+$/)) {
        return [
            { label: 'My Classroom', href: '/dashboard/teacher' },
            { label: 'Subject' },
        ];
    }
    if (pathname.match(/\/dashboard\/teacher\/class\/[^/]+\/attendance$/)) {
        return [
            { label: 'My Classroom', href: '/dashboard/teacher' },
            { label: 'Attendance' },
        ];
    }

    const entry = ROUTES[pathname];
    if (!entry) return [];
    if (typeof entry === 'function') return entry(params);
    return entry;
}
