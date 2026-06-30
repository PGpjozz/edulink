import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

// File storage with two backends:
//  - Vercel Blob when BLOB_READ_WRITE_TOKEN is set (recommended for production
//    / serverless, where the filesystem is ephemeral).
//  - Local disk fallback (dev / self-hosted), served back via /api/files/[id].
const LOCAL_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), '.uploads');

export type StoredFile = { url: string; name: string; size: number; type: string };

const EXT_CONTENT_TYPE: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
    txt: 'text/plain',
};

export function isBlobConfigured(): boolean {
    return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function saveUpload(file: File): Promise<StoredFile> {
    const buf = Buffer.from(await file.arrayBuffer());
    const safeName = (file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${randomUUID()}-${safeName}`;

    if (isBlobConfigured()) {
        const { put } = await import('@vercel/blob');
        const res = await put(key, buf, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
            contentType: file.type || undefined,
        });
        return { url: res.url, name: file.name, size: buf.length, type: file.type };
    }

    await fs.mkdir(LOCAL_DIR, { recursive: true });
    await fs.writeFile(path.join(LOCAL_DIR, key), buf);
    return { url: `/api/files/${key}`, name: file.name, size: buf.length, type: file.type };
}

export async function readLocalFile(id: string): Promise<{ data: Buffer; contentType: string } | null> {
    const safe = path.basename(id); // prevent path traversal
    try {
        const data = await fs.readFile(path.join(LOCAL_DIR, safe));
        const ext = safe.split('.').pop()?.toLowerCase() ?? '';
        return { data, contentType: EXT_CONTENT_TYPE[ext] ?? 'application/octet-stream' };
    } catch {
        return null;
    }
}
