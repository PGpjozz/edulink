const PAGE_TITLES: Record<string, string> = {
    '/dashboard/teacher': 'My Classroom',
    '/dashboard/teacher/homework': 'Homework',
    '/dashboard/teacher/gradebook': 'Gradebook',
    '/dashboard/teacher/behavior': 'Behavior',
    '/dashboard/teacher/quizzes': 'Quizzes',
    '/dashboard/teacher/meetings': 'Meetings',
    '/dashboard/teacher/ai-assistant': 'AI Assistant',
    '/dashboard/hod': 'Department',
    '/dashboard/hod/analytics': 'Analytics',
    '/dashboard/parent': 'Children',
    '/dashboard/parent/notifications': 'Alerts',
    '/dashboard/parent/homework': 'Homework',
    '/dashboard/parent/billing': 'Billing',
    '/dashboard/parent/meetings': 'Meetings',
    '/dashboard/learner': 'My Progress',
    '/dashboard/learner/homework': 'Homework',
    '/dashboard/learner/library': 'Library',
    '/dashboard/learner/quizzes': 'Quizzes',
    '/dashboard/learner/report': 'Report',
    '/dashboard/principal': 'Overview',
    '/dashboard/principal/classes': 'Classes',
    '/dashboard/principal/users': 'Staff',
    '/dashboard/principal/subjects': 'Subjects',
    '/dashboard/principal/departments': 'Departments',
    '/dashboard/principal/analytics': 'Analytics',
    '/dashboard/principal/behavior': 'Behavior',
    '/dashboard/principal/admissions': 'Admissions',
    '/dashboard/principal/finance': 'Finance',
    '/dashboard/principal/settings': 'Settings',
    '/dashboard/messages': 'Messages',
    '/dashboard/announcements': 'Announcements',
    '/dashboard/announcements/new': 'New Announcement',
    '/dashboard/school-owner': 'Overview',
    '/dashboard/school-owner/invites': 'Invites',
    '/dashboard/provider': 'Provider',
    '/dashboard/change-password': 'Change Password',
};

export function getPageTitle(pathname: string): string {
    if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];

    if (pathname.startsWith('/dashboard/teacher/subject/')) return 'Subject';
    if (pathname.startsWith('/dashboard/teacher/class/')) return 'Class';
    if (pathname.startsWith('/dashboard/teacher/gradebook/')) return 'Gradebook';
    if (pathname.startsWith('/dashboard/parent/child/')) return 'Child';
    if (pathname.startsWith('/dashboard/principal')) return 'Principal';
    if (pathname.startsWith('/dashboard/teacher')) return 'Teaching';
    if (pathname.startsWith('/dashboard/parent')) return 'Parent';
    if (pathname.startsWith('/dashboard/learner')) return 'Learner';
    if (pathname.startsWith('/dashboard/hod')) return 'Department';

    return 'EduLink';
}
