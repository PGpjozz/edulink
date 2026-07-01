/** CAPS performance level descriptors (percentage → level 1–7). */
export function capsLevel(percent: number): { level: number; descriptor: string } {
    if (percent >= 80) return { level: 7, descriptor: 'Outstanding achievement' };
    if (percent >= 70) return { level: 6, descriptor: 'Meritorious achievement' };
    if (percent >= 60) return { level: 5, descriptor: 'Substantial achievement' };
    if (percent >= 50) return { level: 4, descriptor: 'Adequate achievement' };
    if (percent >= 40) return { level: 3, descriptor: 'Moderate achievement' };
    if (percent >= 30) return { level: 2, descriptor: 'Elementary achievement' };
    return { level: 1, descriptor: 'Not achieved' };
}

export function currentSchoolTerm(date = new Date()): { term: number; label: string; year: number } {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    if (month <= 3) return { term: 1, label: `Term 1, ${year}`, year };
    if (month <= 6) return { term: 2, label: `Term 2, ${year}`, year };
    if (month <= 9) return { term: 3, label: `Term 3, ${year}`, year };
    return { term: 4, label: `Term 4, ${year}`, year };
}
