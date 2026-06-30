import { NextResponse } from 'next/server';
import { ZipArchive } from 'archiver';
import { PassThrough } from 'stream';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { canManageSchool } from '@/lib/permissions';
import { buildLearnerReportData } from '@/lib/report-service';
import { generateReportPdf, reportPdfFilename } from '@/lib/report-pdf';
import { getCurrentTermLabel } from '@/lib/report-generation';

async function buildZip(files: { name: string; buffer: Buffer }[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const archive = new ZipArchive({ zlib: { level: 9 } });
        const stream = new PassThrough();
        const chunks: Buffer[] = [];

        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        archive.on('error', reject);
        archive.pipe(stream);

        for (const file of files) {
            archive.append(file.buffer, { name: file.name });
        }

        void archive.finalize();
    });
}

export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true, schoolAdmin: true });
    if (auth instanceof NextResponse) return auth;

    if (!canManageSchool(auth.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const term = searchParams.get('term') ?? getCurrentTermLabel();

    if (!classId) {
        return NextResponse.json({ error: 'classId required' }, { status: 400 });
    }

    try {
        const schoolClass = await prisma.class.findFirst({
            where: { id: classId, schoolId: auth.schoolId! },
            include: {
                learners: {
                    include: {
                        user: { select: { firstName: true, lastName: true } },
                    },
                },
            },
        });

        if (!schoolClass) {
            return NextResponse.json({ error: 'Class not found' }, { status: 404 });
        }

        if (schoolClass.learners.length === 0) {
            return NextResponse.json({ error: 'No learners in this class' }, { status: 400 });
        }

        const pdfFiles: { name: string; buffer: Buffer }[] = [];

        for (const learner of schoolClass.learners) {
            const data = await buildLearnerReportData(learner.id, auth.schoolId!, term);
            if (!data) continue;
            const buffer = await generateReportPdf(data);
            pdfFiles.push({ name: reportPdfFilename(data), buffer });
        }

        if (pdfFiles.length === 0) {
            return NextResponse.json({ error: 'Could not generate any reports' }, { status: 500 });
        }

        const zipBuffer = await buildZip(pdfFiles);
        const zipName = `Reports_${schoolClass.name}_${term.replace(/[^a-zA-Z0-9]+/g, '_')}.zip`;

        return new NextResponse(new Uint8Array(zipBuffer), {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${zipName}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Bulk report error:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
