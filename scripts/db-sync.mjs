#!/usr/bin/env node
/**
 * Sync Prisma schema to the database configured in DATABASE_URL / DIRECT_URL.
 * Usage: npm run db:sync
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import pg from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
    console.error('Set DIRECT_URL or DATABASE_URL before running db sync.');
    process.exit(1);
}

console.log('Syncing schema to', url.replace(/:([^:@]+)@/, ':***@'));
execSync('npx prisma db push', { stdio: 'inherit' });

const subscriptionMigration = resolve(
    process.cwd(),
    'prisma/migrations/20260701120000_subscription_fields/migration.sql',
);
const sql = readFileSync(subscriptionMigration, 'utf8');
const client = new pg.Client({ connectionString: url });

try {
    await client.connect();
    await client.query(sql);
} finally {
    await client.end();
}

console.log('Database schema is in sync.');
