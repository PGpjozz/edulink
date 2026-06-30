import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { saveUpload } from '@/lib/storage';

export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const form = await req.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size === 0) {
        return NextResponse.json({ error: 'Empty file' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 });
    }

    try {
        const stored = await saveUpload(file);
        return NextResponse.json(stored);
    } catch (e) {
        console.error('[upload]', e);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
