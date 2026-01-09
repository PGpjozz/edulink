// Simple script to create provider account
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createProvider() {
    try {
        const provider = await prisma.user.create({
            data: {
                email: 'provider@edulink.com',
                password: '$2b$10$Ds.AVNyxHeHMzZipwLAQFu//J3RNUD0b999nmY4t4h/svqRb31/S4.',
                firstName: 'EduLink',
                lastName: 'Provider',
                role: 'PROVIDER',
                schoolId: null,
                isActive: true
            }
        });

        console.log('✅ Provider account created successfully!');
        console.log('Email: provider@edulink.com');
        console.log('Password: provider123');
    } catch (error) {
        if (error.code === 'P2002') {
            console.log('⚠️  Provider account already exists!');
        } else {
            console.error('Error:', error.message);
        }
    } finally {
        await prisma.$disconnect();
    }
}

createProvider();
