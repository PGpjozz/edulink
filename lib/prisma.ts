import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';
import { neonConfig } from '@neondatabase/serverless';
import { Pool } from 'pg';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

function isNeonUrl(connectionString: string): boolean {
    return connectionString.includes('neon.tech') || connectionString.includes('neon.database');
}

function isLocalDatabase(connectionString: string) {
    return /localhost|127\.0\.0\.1/.test(connectionString) || /sslmode=disable/.test(connectionString);
}

const prismaClientSingleton = (connectionString: string) => {
    if (!connectionString) {
        throw new Error('DATABASE_URL is not set');
    }

    if (isNeonUrl(connectionString)) {
        return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
    }

    if (isLocalDatabase(connectionString)) {
        const url = connectionString.replace(/[&?]channel_binding=[^&]*/g, '');
        const pool = new Pool({ connectionString: url });
        return new PrismaClient({ adapter: new PrismaPg(pool) });
    }

    const pool = new Pool({ connectionString });
    return new PrismaClient({ adapter: new PrismaPg(pool) });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined;
    prismaDatabaseUrl: string | undefined;
};

const connectionString = process.env.DATABASE_URL;

if (
    process.env.NODE_ENV !== 'production' &&
    globalForPrisma.prisma &&
    globalForPrisma.prismaDatabaseUrl !== connectionString
) {
    void globalForPrisma.prisma.$disconnect();
    globalForPrisma.prisma = undefined;
}

export const prisma =
    globalForPrisma.prisma ??
    (connectionString
        ? prismaClientSingleton(connectionString)
        : (() => {
              throw new Error('DATABASE_URL is not set');
          })());

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
    globalForPrisma.prismaDatabaseUrl = connectionString;
}
