export type ReportTone = 'professional' | 'encouraging' | 'concise';

export function getCurrentTermLabel(date = new Date()): string {
    const month = date.getMonth();
    const year = date.getFullYear();
    const term = month < 4 ? 1 : month < 8 ? 2 : 3;
    return `Term ${term}, ${year}`;
}

export function calculateAttendanceRate(
    records: { status: string }[],
): number | null {
    if (records.length === 0) return null;
    const present = records.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
    return (present / records.length) * 100;
}

export function calculateSubjectAverage(
    grades: { score: number; assessment: { totalMarks: number } }[],
): number | null {
    if (grades.length === 0) return null;
    const percentages = grades.map((g) => (g.score / g.assessment.totalMarks) * 100);
    return percentages.reduce((a, b) => a + b, 0) / percentages.length;
}

export function buildSubjectReportComment(options: {
    firstName: string;
    subjectName: string;
    average: number | null;
    tone?: ReportTone;
    attendanceRate?: number | null;
    assessmentCount?: number;
}): string {
    const {
        firstName,
        subjectName,
        average,
        tone = 'professional',
        attendanceRate = null,
        assessmentCount = 0,
    } = options;

    const name = firstName.trim() || 'The learner';
    let comment = '';

    if (average !== null && average >= 75) {
        comment = `${name} demonstrates strong achievement in ${subjectName} with an average of ${Math.round(average)}% across recent assessments. `;
    } else if (average !== null && average >= 50) {
        comment = `${name} is progressing steadily in ${subjectName} with an average of ${Math.round(average)}%. Continued practice on core skills will support further improvement. `;
    } else if (average !== null) {
        comment = `${name} is working to consolidate understanding in ${subjectName} (average ${Math.round(average)}%). Targeted revision and additional support are recommended. `;
    } else if (assessmentCount > 0) {
        comment = `${name} has assessment activity recorded in ${subjectName}; final marks are still being captured. `;
    } else {
        comment = `${name} is engaging well in ${subjectName}. Assessment data is still being collected for this reporting period. `;
    }

    if (attendanceRate !== null) {
        if (attendanceRate >= 90) {
            comment += `Excellent attendance (${Math.round(attendanceRate)}%) supports consistent learning. `;
        } else if (attendanceRate >= 75) {
            comment += `Attendance is generally satisfactory at ${Math.round(attendanceRate)}%. `;
        } else {
            comment += `Improved attendance (currently ${Math.round(attendanceRate)}%) will help ${name} keep pace with the class. `;
        }
    }

    if (tone === 'encouraging') {
        comment += `Well done, ${name} — keep building on your strengths and stay curious!`;
    } else if (tone === 'concise') {
        const avgPart = average !== null ? `${Math.round(average)}% avg` : 'assessments in progress';
        const attPart = attendanceRate !== null ? `, ${Math.round(attendanceRate)}% attendance` : '';
        return `${name}: ${avgPart} in ${subjectName}${attPart}.`;
    } else {
        comment += `Continued effort in upcoming units will support a positive academic trajectory in ${subjectName}.`;
    }

    return comment.trim();
}
