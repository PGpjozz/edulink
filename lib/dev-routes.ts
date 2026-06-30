import { NextResponse } from 'next/server';
import { isDevRouteEnabled } from './env';

export function guardDevRoute(expectedSecret: string, providedSecret: string | null): NextResponse | null {
    if (!isDevRouteEnabled()) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (providedSecret !== expectedSecret) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return null;
}
