import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

export function prismaErrorResponse(error: unknown, logLabel: string): NextResponse {
    console.error(logLabel, error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022') {
        return NextResponse.json(
            {
                error:
                    'Database schema is out of date. Redeploy the app or run `npx prisma db push` against the production database.',
                code: 'SCHEMA_OUT_OF_DATE',
            },
            { status: 503 },
        );
    }

    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
}
