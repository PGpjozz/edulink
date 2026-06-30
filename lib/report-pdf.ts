import PDFDocument from 'pdfkit';
import type { LearnerReportData } from '@/lib/report-service';

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-ZA', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function safeFilename(name: string) {
    return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80);
}

export function reportPdfFilename(data: LearnerReportData) {
    return `Report_${safeFilename(data.learner.name)}_${safeFilename(data.term)}.pdf`;
}

export function generateReportPdf(data: LearnerReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 48, size: 'A4' });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

        doc.fontSize(10).fillColor('#64748b').text('EDULINK INTELLIGENCE', { align: 'left' });
        doc.moveDown(0.3);
        doc.fontSize(22).fillColor('#0f172a').text('Academic Report', { align: 'left' });
        doc.fontSize(14).fillColor('#2563eb').text(data.learner.schoolName);
        doc.moveDown(0.5);

        doc.fontSize(11).fillColor('#0f172a');
        doc.text(data.term, doc.page.margins.left, doc.y, { continued: true, width: pageWidth / 2 });
        doc.text(`Issued: ${formatDate(data.issuedAt)}`, { align: 'right' });
        doc.moveDown(1);

        doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke('#e2e8f0');
        doc.moveDown(1);

        doc.fontSize(9).fillColor('#2563eb').text('LEARNER IDENTITY');
        doc.moveDown(0.3);
        doc.fontSize(16).fillColor('#0f172a').text(data.learner.name);
        doc.fontSize(11).fillColor('#475569').text(`Grade ${data.learner.grade} • ${data.learner.className}`);
        doc.moveDown(0.8);

        const statsY = doc.y;
        doc.roundedRect(doc.page.margins.left, statsY, pageWidth, 52, 6).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.fillColor('#475569').fontSize(10);
        doc.text('Attendance Rate', doc.page.margins.left + 12, statsY + 12);
        doc.text('Academic Average', doc.page.margins.left + pageWidth / 2, statsY + 12);
        doc.fillColor('#0f172a').fontSize(14);
        doc.text(
            data.stats.attendanceRate !== null ? `${data.stats.attendanceRate}%` : 'N/A',
            doc.page.margins.left + 12,
            statsY + 28,
        );
        doc.text(`${data.stats.overallAverage}%`, doc.page.margins.left + pageWidth / 2, statsY + 28);
        doc.moveDown(3.5);

        doc.fontSize(9).fillColor('#64748b');
        const colSubject = doc.page.margins.left;
        const colAvg = colSubject + pageWidth * 0.35;
        const colComment = colSubject + pageWidth * 0.5;
        doc.text('SUBJECT', colSubject, doc.y);
        doc.text('ACHIEVEMENT', colAvg, doc.y);
        doc.text('TEACHER OBSERVATIONS', colComment, doc.y);
        doc.moveDown(0.6);
        doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke('#e2e8f0');
        doc.moveDown(0.5);

        for (const sub of data.subjects) {
            const rowTop = doc.y;
            if (rowTop > doc.page.height - 120) {
                doc.addPage();
            }

            doc.fontSize(11).fillColor('#0f172a').text(sub.subjectName, colSubject, doc.y, { width: pageWidth * 0.32 });
            const nameHeight = doc.heightOfString(sub.subjectName, { width: pageWidth * 0.32 });
            if (sub.subjectCode) {
                doc.fontSize(8).fillColor('#64748b').text(sub.subjectCode, colSubject, rowTop + nameHeight + 2);
            }

            const avgText = sub.average !== null ? `${sub.average}%` : 'N/A';
            doc.fontSize(11).fillColor(sub.average !== null && sub.average >= 50 ? '#15803d' : '#b91c1c');
            doc.text(avgText, colAvg, rowTop, { width: pageWidth * 0.12 });

            doc.fontSize(9).fillColor('#475569');
            const commentPrefix = sub.isTeacherComment ? '' : '';
            doc.text(`${commentPrefix}${sub.comment}`, colComment, rowTop, {
                width: pageWidth * 0.48,
                align: 'left',
            });

            const commentHeight = doc.heightOfString(`${commentPrefix}${sub.comment}`, { width: pageWidth * 0.48 });
            doc.y = Math.max(rowTop + nameHeight + 14, rowTop + commentHeight) + 10;
        }

        doc.moveDown(2);
        const footerY = doc.page.height - doc.page.margins.bottom - 40;
        doc.fontSize(9).fillColor('#0f172a');
        doc.text('Class Teacher', doc.page.margins.left, footerY, { width: 140, align: 'center', underline: true });
        doc.text('Executive Principal', doc.page.width - doc.page.margins.right - 140, footerY, {
            width: 140,
            align: 'center',
            underline: true,
        });

        doc.end();
    });
}
