import { getCurrentTermLabel } from '@/lib/report-generation';

export type AssessmentLabelInput = {
    term?: string | null;
    paper?: string | null;
    title?: string | null;
    type?: string | null;
    subjectName?: string | null;
};

export function getTermOptions(count = 6): string[] {
    const options: string[] = [];
    const now = new Date();
    for (let offset = -2; offset < count - 2; offset++) {
        const date = new Date(now.getFullYear(), now.getMonth() + offset * 4, 1);
        const label = getCurrentTermLabel(date);
        if (!options.includes(label)) options.push(label);
    }
    if (!options.includes(getCurrentTermLabel(now))) {
        options.unshift(getCurrentTermLabel(now));
    }
    return options;
}

export function formatAssessmentTitle(input: AssessmentLabelInput): string {
    if (input.title?.trim()) return input.title.trim();

    const parts: string[] = [];
    if (input.term?.trim()) parts.push(input.term.trim());
    if (input.subjectName?.trim()) parts.push(input.subjectName.trim());
    if (input.paper?.trim()) parts.push(input.paper.trim());
    else if (input.type?.trim()) parts.push(input.type.trim());

    return parts.join(' · ') || 'Assessment';
}

export function formatAssessmentShortLabel(input: AssessmentLabelInput): string {
    const parts: string[] = [];
    if (input.term?.trim()) parts.push(input.term.trim());
    if (input.paper?.trim()) parts.push(input.paper.trim());
    if (parts.length > 0) return parts.join(' · ');
    return input.title?.trim() || 'Assessment';
}

export function scoreToPercentage(score: number, totalMarks: number): number | null {
    if (!Number.isFinite(score) || totalMarks <= 0) return null;
    return Math.round((score / totalMarks) * 1000) / 10;
}

export function validateGradeScore(
    score: number,
    totalMarks: number,
): { valid: boolean; error?: string } {
    if (!Number.isFinite(score)) {
        return { valid: false, error: 'Score must be a number' };
    }
    if (score < 0) {
        return { valid: false, error: 'Score cannot be negative' };
    }
    if (score > totalMarks) {
        return { valid: false, error: `Score cannot exceed ${totalMarks}` };
    }
    return { valid: true };
}

export type CsvGradeRow = {
    learnerId?: string;
    idNumber?: string;
    name?: string;
    score: number;
    comments?: string;
};

export function parseGradesCsv(text: string): { rows: CsvGradeRow[]; errors: string[] } {
    const lines = text
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length < 2) {
        return { rows: [], errors: ['CSV must include a header row and at least one data row'] };
    }

    const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
    const scoreIdx = header.findIndex((h) => h === 'score' || h === 'mark' || h === 'marks');
    if (scoreIdx < 0) {
        return { rows: [], errors: ['CSV must include a score column'] };
    }

    const learnerIdIdx = header.findIndex((h) => h === 'learner_id' || h === 'learnerid');
    const idNumberIdx = header.findIndex((h) => h === 'id_number' || h === 'idnumber' || h === 'id');
    const nameIdx = header.findIndex((h) => h === 'name' || h === 'learner_name' || h === 'learner');
    const commentsIdx = header.findIndex((h) => h === 'comments' || h === 'comment');

    const rows: CsvGradeRow[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
        const cols = splitCsvLine(lines[i]);
        const rawScore = cols[scoreIdx]?.trim();
        if (!rawScore) continue;

        const score = Number(rawScore);
        if (!Number.isFinite(score)) {
            errors.push(`Row ${i + 1}: invalid score "${rawScore}"`);
            continue;
        }

        rows.push({
            learnerId: learnerIdIdx >= 0 ? cols[learnerIdIdx]?.trim() : undefined,
            idNumber: idNumberIdx >= 0 ? cols[idNumberIdx]?.trim() : undefined,
            name: nameIdx >= 0 ? cols[nameIdx]?.trim() : undefined,
            score,
            comments: commentsIdx >= 0 ? cols[commentsIdx]?.trim() : undefined,
        });
    }

    return { rows, errors };
}

export function buildGradesCsvTemplate(
    learners: { id: string; user: { firstName: string; lastName: string; idNumber?: string | null } }[],
    grades: Record<string, { score?: number; comments?: string }> = {},
): string {
    const header = 'learner_id,id_number,first_name,last_name,score,comments';
    const lines = learners.map((learner) => {
        const existing = grades[learner.id];
        const cols = [
            learner.id,
            learner.user.idNumber ?? '',
            learner.user.firstName,
            learner.user.lastName,
            existing?.score ?? '',
            existing?.comments ?? '',
        ];
        return cols.map(csvEscape).join(',');
    });
    return [header, ...lines].join('\n');
}

function splitCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }
        if (ch === ',' && !inQuotes) {
            result.push(current);
            current = '';
            continue;
        }
        current += ch;
    }
    result.push(current);
    return result;
}

function csvEscape(value: string | number): string {
    const str = String(value);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
}
