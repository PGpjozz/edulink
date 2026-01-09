import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Creating SaaS Provider account...');

    const hashedPassword = await bcrypt.hash('provider123', 10);

    const provider = await prisma.user.create({
        data: {
            email: 'provider@edulink.com',
            password: hashedPassword,
            firstName: 'EduLink',
            lastName: 'Provider',
            role: 'PROVIDER',
            schoolId: null, // Provider is not tied to any school
            isActive: true
        }
    });

    console.log('✅ SaaS Provider created successfully!');
    console.log('\n📝 Provider Credentials:');
    console.log('Email: provider@edulink.com');
    console.log('Password: provider123');
    console.log('\nℹ️  Log in to onboard your first school!');
}

main()
    .catch((e) => {
        console.error('❌ Error:');
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
