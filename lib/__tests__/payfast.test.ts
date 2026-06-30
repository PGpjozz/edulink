import { describe, it, expect } from 'vitest';
import {
    formatPayFastAmount,
    generatePayFastSignature,
    parsePayFastRawBody,
    verifyPayFastSignature,
} from '../payfast';

function encode(value: string): string {
    return encodeURIComponent(value).replace(/%20/g, '+');
}

function toBody(data: Record<string, string>, signature: string): string {
    const parts = Object.entries(data).map(([k, v]) => `${k}=${encode(v)}`);
    parts.push(`signature=${signature}`);
    return parts.join('&');
}

describe('payfast', () => {
    it('formats amounts to two decimals', () => {
        expect(formatPayFastAmount(10)).toBe('10.00');
        expect(formatPayFastAmount(10.5)).toBe('10.50');
        expect(formatPayFastAmount(1234.567)).toBe('1234.57');
    });

    it('generates a signature that verifies for the same param string + passphrase', () => {
        const data = { merchant_id: '10000100', amount: '100.00', item_name: 'Test Item' };
        const sig = generatePayFastSignature(data, 'passphrase123');
        const { paramString } = parsePayFastRawBody(toBody(data, sig));
        expect(verifyPayFastSignature(paramString, sig, 'passphrase123')).toBe(true);
    });

    it('fails verification with the wrong passphrase', () => {
        const data = { merchant_id: '10000100', amount: '100.00' };
        const sig = generatePayFastSignature(data, 'right-passphrase');
        const { paramString } = parsePayFastRawBody(toBody(data, sig));
        expect(verifyPayFastSignature(paramString, sig, 'wrong-passphrase')).toBe(false);
    });

    it('parses a raw body, excluding signature and empty values from the param string', () => {
        const { data, paramString } = parsePayFastRawBody('a=1&b=&signature=xyz&c=hello+world');
        expect(data.a).toBe('1');
        expect(data.b).toBe('');
        expect(data.signature).toBe('xyz');
        expect(data.c).toBe('hello world');
        expect(paramString).toBe('a=1&c=hello+world');
    });
});
