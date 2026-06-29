import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';

/**
 * Parse and validate a JSON request body against a Zod schema.
 * Returns the typed data, or a 400 NextResponse with field errors.
 */
export async function parseBody<T>(
    req: Request,
    schema: ZodType<T>
): Promise<T | NextResponse> {
    let raw: unknown;
    try {
        raw = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const result = schema.safeParse(raw);
    if (!result.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: flattenZodError(result.error) },
            { status: 400 }
        );
    }
    return result.data;
}

function flattenZodError(error: ZodError): Record<string, string> {
    const out: Record<string, string> = {};
    for (const issue of error.issues) {
        const path = issue.path.join('.') || '_';
        if (!out[path]) out[path] = issue.message;
    }
    return out;
}

/**
 * Standard 500 response that logs the real error server-side but never leaks
 * internals (messages/stack) to the client.
 */
export function serverError(context: string, error: unknown): NextResponse {
    console.error(`[${context}]`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
}
