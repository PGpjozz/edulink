import { prisma } from '@/lib/prisma';
import type { AuthContext } from '@/lib/api-auth';
import { getStaffContext } from '@/lib/staff-context';
import {
    TIMETABLE_DAYS,
    type ClassTimetable,
    getPeriodTime,
    getSlotPeriod,
    getSlotSubjectName,
    slotMatchesSubject,
} from '@/lib/timetable';

export type TeacherScheduleSlot = {
    day: string;
    period: number;
    time: string;
    classId: string;
    className: string;
    grade: string;
    subjectId: string;
    subjectName: string;
};

function parseTimetable(value: unknown): ClassTimetable {
    if (!value || typeof value !== 'object') return {};
    return value as ClassTimetable;
}

export async function buildTeacherSchedule(auth: AuthContext): Promise<TeacherScheduleSlot[]> {
    const ctx = await getStaffContext(auth);
    if (!ctx.teacherProfileId || !auth.schoolId) return [];

    const assignments = await prisma.classSubject.findMany({
        where: { teacherProfileId: ctx.teacherProfileId },
        include: {
            class: { select: { id: true, name: true, grade: true, timetable: true, schoolId: true } },
            subject: { select: { id: true, name: true } },
        },
    });

    const slots: TeacherScheduleSlot[] = [];
    const seen = new Set<string>();

    for (const assignment of assignments) {
        if (assignment.class.schoolId !== auth.schoolId) continue;

        const timetable = parseTimetable(assignment.class.timetable);
        for (const day of TIMETABLE_DAYS) {
            for (const slot of timetable[day] ?? []) {
                const period = getSlotPeriod(slot);
                if (!period) continue;
                if (!slotMatchesSubject(slot, assignment.subject.id, assignment.subject.name)) continue;

                const key = `${day}:${period}:${assignment.class.id}:${assignment.subject.id}`;
                if (seen.has(key)) continue;
                seen.add(key);

                slots.push({
                    day,
                    period,
                    time: slot.time ?? getPeriodTime(period),
                    classId: assignment.class.id,
                    className: assignment.class.name,
                    grade: assignment.class.grade,
                    subjectId: assignment.subject.id,
                    subjectName: getSlotSubjectName(slot) || assignment.subject.name,
                });
            }
        }
    }

    const dayOrder = Object.fromEntries(TIMETABLE_DAYS.map((d, i) => [d, i]));
    slots.sort((a, b) => {
        const dayDiff = (dayOrder[a.day] ?? 99) - (dayOrder[b.day] ?? 99);
        if (dayDiff !== 0) return dayDiff;
        return a.period - b.period;
    });

    return slots;
}

export function getTodaySchedule(slots: TeacherScheduleSlot[]): TeacherScheduleSlot[] {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return slots.filter((slot) => slot.day === today);
}
