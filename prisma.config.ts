import { config } from "dotenv";
import { resolve } from "path";
import { defineConfig } from "prisma/config";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

function databaseUrl(): string | undefined {
    const direct = process.env.DIRECT_URL?.trim();
    const pooled = process.env.DATABASE_URL?.trim();
    return direct || pooled || undefined;
}

const url = databaseUrl();

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
        seed: "tsx prisma/seed.ts",
    },
    // Neon: use DIRECT_URL for CLI (migrate, db push, seed). Pooled DATABASE_URL is for the app runtime.
    // Omit the url when the host only injects it at runtime, so `prisma generate` can still run.
    ...(url ? { datasource: { url } } : {}),
});
