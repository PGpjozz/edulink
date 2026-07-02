/** Minimal RFC-4180-ish CSV helpers for streaming report exports. */

function escapeCell(value: unknown): string {
    if (value == null) return '';
    const str = String(value);
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

export function toCsv(headers: string[], rows: (unknown[])[]): string {
    const lines = [headers.map(escapeCell).join(',')];
    for (const row of rows) {
        lines.push(row.map(escapeCell).join(','));
    }
    // Prepend BOM so Excel opens UTF-8 (e.g. learner names) correctly.
    return '\uFEFF' + lines.join('\r\n');
}

export function csvResponse(filename: string, csv: string): Response {
    return new Response(csv, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    });
}
