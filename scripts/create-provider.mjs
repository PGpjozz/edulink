import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const bcrypt = require('bcryptjs');
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { neon } from '@neondatabase/serverless';

const envPath = resolve(process.cwd(), '.env');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
for (const line of envContent.split('\n')) {
    const match = line.match(/^([^=]+)=["']?(.+?)["']?\s*$/);
    if (match) envVars[match[1].trim()] = match[2].trim();
}

const connectionString = envVars.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL not found in .env');

console.log('Connecting via Neon HTTP to:', connectionString.replace(/:([^:@]+)@/, ':***@'));

const sql = neon(connectionString);

const hash = await bcrypt.hash('provider123', 10);

try {
    const res = await sql`
        INSERT INTO "User" (id, email, password, "firstName", "lastName", role, "schoolId", "isActive", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), 'provider@edulink.com', ${hash}, 'EduLink', 'Provider', 'PROVIDER', NULL, true, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, "isActive" = true
        RETURNING id, email, role
    `;
    console.log('✅ Provider user created/updated:', res[0]);
} catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
}
