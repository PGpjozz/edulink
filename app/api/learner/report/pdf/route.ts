import { NextResponse } from 'next/server';
import { requireAuth, type AuthContext } from '@/lib/api-auth';
import { canAccessLearner } from '@/lib/staff-context';
import {
    buildLearnerReportData,
    resolveLearnerProfileForReport,
} from '@/lib/report-service';
import { generateReportPdf, reportPdfFilename } from '@/lib/report-pdf';
import { getCurrentTermLabel } from '@/lib/report-generation';

async function authorizeProfileAccess(auth: AuthContext, profileId: string) {
    if (auth.role === 'TEACHER' || auth.role === 'HOD') {
        return canAccessLearner(auth, profileId);
    }
    return true;
}

export async function GET(req: Request) {
    const auth = await requireAuth({ requireSchoolId: true });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const childId = searchParams.get('childId');
    const learnerProfileId = searchParams.get('learnerId');
    const term = searchParams.get('term') ?? getCurrentTermLabel();

    const allowedRoles = ['LEARNER', 'PARENT', 'PRINCIPAL', 'SCHOOL_ADMIN', 'SCHOOL_OWNER', 'TEACHER', 'HOD'];
    if (!allowedRoles.includes(auth.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const profileId = await resolveLearnerProfileForReport(auth, {
            childUserId: childId,
            learnerProfileId,
        });

        if (!profileId) {
            return NextResponse.json({ error: 'Learner not found' }, { status: 404 });
        }

        if (!(await authorizeProfileAccess(auth, profileId))) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const data = await buildLearnerReportData(profileId, auth.schoolId!, term);
        if (!data) {
            return NextResponse.json({ error: 'Learner not found' }, { status: 404 });
        }

        const pdf = await generateReportPdf(data);
        const filename = reportPdfFilename(data);

        return new NextResponse(new Uint8Array(pdf), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Report PDF error:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
