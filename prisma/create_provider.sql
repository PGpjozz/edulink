-- Create SaaS Provider Account
-- Run this in PostgreSQL (pgAdmin or psql)
-- Database: edulink

INSERT INTO users (
    id,
    email,
    password,
    "firstName",
    "lastName",
    role,
    "schoolId",
    "isActive",
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid(),
    'provider@edulink.com',
    '$2b$10$Ds.AVNyxHeHMzZipwLAQFu//J3RNUD0b999nmY4t4h/svqRb31/S4.',
    'EduLink',
    'Provider',
    'PROVIDER',
    NULL,
    true,
    NOW(),
    NOW()
);

-- Provider Login Credentials:
-- Email: provider@edulink.com
-- Password: provider123
