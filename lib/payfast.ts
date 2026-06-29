import crypto from 'crypto';

const SANDBOX = process.env.PAYFAST_SANDBOX === 'true';

export const PAYFAST_PROCESS_URL = SANDBOX
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process';

export const PAYFAST_VALIDATE_URL = SANDBOX
    ? 'https://sandbox.payfast.co.za/eng/query/validate'
    : 'https://www.payfast.co.za/eng/query/validate';

export function isPayFastConfigured(): boolean {
    return Boolean(process.env.PAYFAST_MERCHANT_ID && process.env.PAYFAST_MERCHANT_KEY);
}

function encodePayFastValue(value: string): string {
    return encodeURIComponent(value.trim()).replace(/%20/g, '+');
}

/** Build signature from fields in definition order (PayFast outbound form). */
export function generatePayFastSignature(
    data: Record<string, string>,
    passphrase?: string
): string {
    let output = '';
    for (const [key, val] of Object.entries(data)) {
        if (key === 'signature') continue;
        if (val !== '' && val != null) {
            output += `${key}=${encodePayFastValue(String(val))}&`;
        }
    }
    let paramString = output.endsWith('&') ? output.slice(0, -1) : output;
    if (passphrase) {
        paramString += `&passphrase=${encodePayFastValue(passphrase)}`;
    }
    return crypto.createHash('md5').update(paramString).digest('hex');
}

/** Verify ITN signature from raw param string (order as received). */
export function verifyPayFastSignature(
    pfParamString: string,
    signature: string,
    passphrase?: string
): boolean {
    let temp = pfParamString;
    if (passphrase) {
        temp += `&passphrase=${encodePayFastValue(passphrase)}`;
    }
    const expected = crypto.createHash('md5').update(temp).digest('hex');
    return expected === signature;
}

export function formatPayFastAmount(amount: number): string {
    return amount.toFixed(2);
}

export function parsePayFastRawBody(body: string): {
    data: Record<string, string>;
    paramString: string;
} {
    const data: Record<string, string> = {};
    const parts: string[] = [];

    for (const pair of body.split('&')) {
        if (!pair) continue;
        const eq = pair.indexOf('=');
        const rawKey = eq >= 0 ? pair.slice(0, eq) : pair;
        const rawVal = eq >= 0 ? pair.slice(eq + 1) : '';
        const key = decodeURIComponent(rawKey.replace(/\+/g, '%20'));
        const val = decodeURIComponent(rawVal.replace(/\+/g, '%20'));
        data[key] = val;
        if (key !== 'signature' && val !== '') {
            parts.push(`${key}=${encodeURIComponent(val).replace(/%20/g, '+')}`);
        }
    }

    return { data, paramString: parts.join('&') };
}

export async function validateItnWithPayFast(pfParamString: string): Promise<boolean> {
    try {
        const res = await fetch(PAYFAST_VALIDATE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: pfParamString,
        });
        const text = (await res.text()).trim();
        return text === 'VALID';
    } catch (err) {
        console.error('PayFast validate error:', err);
        return false;
    }
}

export function getPayFastPassphrase(): string | undefined {
    const p = process.env.PAYFAST_PASSPHRASE?.trim();
    return p || undefined;
}
