import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { readLocalFile } from '@/lib/storage';

export const runtime = 'nodejs';

// Serves locally-stored uploads (dev / self-hosted fallback). When Vercel Blob
// is configured, file URLs point directly at Blob and this route is unused.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const file = await readLocalFile(id);
    if (!file) return new NextResponse('Not found', { status: 404 });

    return new NextResponse(new Uint8Array(file.data), {
        headers: {
            'Content-Type': file.contentType,
            'Content-Disposition': `inline; filename="${id}"`,
            'Cache-Control': 'private, max-age=3600',
        },
    });
}
