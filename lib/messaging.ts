const STAFF_MESSAGE_ROLES = ['TEACHER', 'PRINCIPAL', 'SCHOOL_ADMIN', 'HOD'] as const;

export function canMessage(senderRole: string, recipientRole: string): boolean {
    const isStaff = STAFF_MESSAGE_ROLES.includes(senderRole as (typeof STAFF_MESSAGE_ROLES)[number]);
    const recipientIsStaff = STAFF_MESSAGE_ROLES.includes(recipientRole as (typeof STAFF_MESSAGE_ROLES)[number]);

    return (
        (isStaff && recipientRole === 'PARENT') ||
        (senderRole === 'PARENT' && recipientIsStaff)
    );
}

export function isMessagingRole(role: string): boolean {
    return role === 'PARENT' || STAFF_MESSAGE_ROLES.includes(role as (typeof STAFF_MESSAGE_ROLES)[number]);
}
