import { config } from "dotenv";
import { resolve } from "path";
import { defineConfig } from "prisma/config";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
        seed: "tsx prisma/seed.ts",
    },
    // Neon: use DIRECT_URL for CLI (migrate, db push, seed). Pooled DATABASE_URL is for the app runtime.
    datasource: {
        url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
    },
});
