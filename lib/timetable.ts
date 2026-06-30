export const TIMETABLE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

export const TIMETABLE_PERIODS = [
    { num: 1, time: '08:00 - 09:00' },
    { num: 2, time: '09:00 - 10:00' },
    { num: 3, time: '10:00 - 11:00' },
    { num: 4, time: '11:30 - 12:30' },
    { num: 5, time: '12:30 - 13:30' },
] as const;

export type TimetableSlot = {
    period?: number;
    p?: number;
    subject?: string;
    subjectName?: string;
    subjectId?: string;
    time?: string;
};

export type ClassTimetable = Record<string, TimetableSlot[]>;

export function getSlotPeriod(slot: TimetableSlot): number | undefined {
    return slot.period ?? slot.p;
}

export function getSlotSubjectName(slot: TimetableSlot): string {
    return slot.subjectName ?? slot.subject ?? '';
}

export function getPeriodTime(period: number): string {
    return TIMETABLE_PERIODS.find((p) => p.num === period)?.time ?? '';
}

export function slotMatchesSubject(
    slot: TimetableSlot,
    subjectId: string,
    subjectName: string,
): boolean {
    if (slot.subjectId && slot.subjectId === subjectId) return true;
    const name = getSlotSubjectName(slot);
    return name.toLowerCase() === subjectName.toLowerCase();
}
