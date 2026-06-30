/** South African ID number: 13 digits with Luhn checksum on first 12 digits. */

export function normalizeSaId(id: string): string {
    return id.replace(/\D/g, '');
}

export function validateSaId(id: string): { valid: boolean; error?: string } {
    const normalized = normalizeSaId(id);

    if (normalized.length !== 13) {
        return { valid: false, error: 'SA ID number must be exactly 13 digits' };
    }

    if (!/^\d{13}$/.test(normalized)) {
        return { valid: false, error: 'SA ID number must contain only digits' };
    }

    // Luhn checksum (first 12 digits; 13th is check digit)
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        let digit = parseInt(normalized[i], 10);
        if (i % 2 === 1) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    if (checkDigit !== parseInt(normalized[12], 10)) {
        return { valid: false, error: 'Invalid SA ID number (checksum failed)' };
    }

    // Basic date sanity (YYMMDD in positions 0-5)
    const month = parseInt(normalized.substring(2, 4), 10);
    const day = parseInt(normalized.substring(4, 6), 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return { valid: false, error: 'Invalid SA ID number (invalid date component)' };
    }

    return { valid: true };
}
