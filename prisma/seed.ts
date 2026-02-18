import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Creating SaaS Provider account...');

    const hashedPassword = await bcrypt.hash('provider123', 10);

    await prisma.user.upsert({
        where: { email: 'provider@edulink.com' },
        update: {
            password: hashedPassword,
            firstName: 'EduLink',
            lastName: 'Provider',
            role: 'PROVIDER',
            schoolId: null,
            isActive: true
        },
        create: {
            email: 'provider@edulink.com',
            password: hashedPassword,
            firstName: 'EduLink',
            lastName: 'Provider',
            role: 'PROVIDER',
            schoolId: null, // Provider is not tied to any school
            isActive: true
        }
    });

    const providerUser = await prisma.user.findUnique({ where: { email: 'provider@edulink.com' } });
    if (!providerUser) {
        throw new Error('Failed to load provider user after upsert');
    }

    console.log('✅ SaaS Provider created successfully!');
    console.log('\n📝 Provider Credentials:');
    console.log('Email: provider@edulink.com');
    console.log('Password: provider123');
    console.log('\nℹ️  Log in to onboard your first school!');

    console.log('\n🌱 Creating demo school + users + learner data...');

    const school = await prisma.school.upsert({
        where: { id: 'mock-school-1' },
        update: {},
        create: {
            id: 'mock-school-1',
            name: 'EduLink Demo School',
            subdomain: 'demo',
            tier: 'SMALL',
            isActive: true,
            gradesOffered: ['8', '9', '10', '11', '12'],
            monthlyFee: 1000,
            primaryColor: '#2563eb'
        }
    });

    await prisma.user.upsert({
        where: { email: 'principal@demo.com' },
        update: { id: 'mock-principal-1', role: 'PRINCIPAL', schoolId: school.id, firstName: 'John', lastName: 'Smith', isActive: true },
        create: {
            id: 'mock-principal-1',
            email: 'principal@demo.com',
            password: null,
            firstName: 'John',
            lastName: 'Smith',
            role: 'PRINCIPAL',
            schoolId: school.id,
            isActive: true
        }
    });

    const teacherUser = await prisma.user.upsert({
        where: { email: 'teacher@demo.com' },
        update: { id: 'mock-teacher-1', role: 'TEACHER', schoolId: school.id, firstName: 'Sarah', lastName: 'Johnson', isActive: true },
        create: {
            id: 'mock-teacher-1',
            email: 'teacher@demo.com',
            password: null,
            firstName: 'Sarah',
            lastName: 'Johnson',
            role: 'TEACHER',
            schoolId: school.id,
            isActive: true
        }
    });

    const teacherProfile = await prisma.teacherProfile.upsert({
        where: { userId: teacherUser.id },
        update: {},
        create: {
            userId: teacherUser.id,
            qualifications: 'BEd'
        }
    });

    await prisma.user.upsert({
        where: { email: 'parent@demo.com' },
        update: { id: 'mock-parent-1', role: 'PARENT', schoolId: school.id, firstName: 'Mike', lastName: 'Williams', isActive: true },
        create: {
            id: 'mock-parent-1',
            email: 'parent@demo.com',
            password: null,
            firstName: 'Mike',
            lastName: 'Williams',
            role: 'PARENT',
            schoolId: school.id,
            isActive: true
        }
    });

    await prisma.user.upsert({
        where: { email: 'admin@demo.com' },
        update: { id: 'mock-admin-1', role: 'SCHOOL_ADMIN', schoolId: school.id, firstName: 'Admin', lastName: 'User', isActive: true },
        create: {
            id: 'mock-admin-1',
            email: 'admin@demo.com',
            password: null,
            firstName: 'Admin',
            lastName: 'User',
            role: 'SCHOOL_ADMIN',
            schoolId: school.id,
            isActive: true
        }
    });

    const learnerUser = await prisma.user.upsert({
        where: { idNumber: 'L12345' },
        update: { id: 'mock-learner-1', role: 'LEARNER', schoolId: school.id, firstName: 'Emma', lastName: 'Davis', isActive: true },
        create: {
            id: 'mock-learner-1',
            email: 'learner@demo.com',
            password: null,
            firstName: 'Emma',
            lastName: 'Davis',
            role: 'LEARNER',
            schoolId: school.id,
            idNumber: 'L12345',
            isActive: true
        }
    });

    const class8A = await prisma.class.upsert({
        where: { id: 'mock-class-8a' },
        update: { teacherProfileId: teacherProfile.id },
        create: {
            id: 'mock-class-8a',
            schoolId: school.id,
            name: '8A',
            grade: '8',
            teacherProfileId: teacherProfile.id,
            timetable: {
                days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                periods: [
                    { day: 'Mon', slots: ['Math', 'English', 'Science', 'History', 'Life Orientation'] },
                    { day: 'Tue', slots: ['English', 'Math', 'Geography', 'Science', 'Arts'] },
                    { day: 'Wed', slots: ['Science', 'English', 'Math', 'History', 'PE'] },
                    { day: 'Thu', slots: ['Math', 'Geography', 'English', 'Science', 'Technology'] },
                    { day: 'Fri', slots: ['English', 'Math', 'Science', 'History', 'Assembly'] }
                ]
            }
        }
    });

    const learnerProfile = await prisma.learnerProfile.upsert({
        where: { userId: learnerUser.id },
        update: { classId: class8A.id, grade: '8' },
        create: {
            userId: learnerUser.id,
            grade: '8',
            classId: class8A.id,
            parentIds: ['mock-parent-1']
        }
    });

    const subjects = await Promise.all([
        prisma.subject.upsert({
            where: { id: 'mock-subject-math-8' },
            update: { teacherId: teacherProfile.id },
            create: { id: 'mock-subject-math-8', schoolId: school.id, name: 'Mathematics', code: 'MATH', grade: '8', teacherId: teacherProfile.id }
        }),
        prisma.subject.upsert({
            where: { id: 'mock-subject-eng-8' },
            update: { teacherId: teacherProfile.id },
            create: { id: 'mock-subject-eng-8', schoolId: school.id, name: 'English', code: 'ENG', grade: '8', teacherId: teacherProfile.id }
        }),
        prisma.subject.upsert({
            where: { id: 'mock-subject-sci-8' },
            update: { teacherId: teacherProfile.id },
            create: { id: 'mock-subject-sci-8', schoolId: school.id, name: 'Natural Sciences', code: 'SCI', grade: '8', teacherId: teacherProfile.id }
        })
    ]);

    const now = new Date();
    const assessments = await Promise.all([
        prisma.assessment.upsert({
            where: { id: 'mock-assessment-math-test-1' },
            update: {},
            create: {
                id: 'mock-assessment-math-test-1',
                subjectId: subjects[0].id,
                title: 'Term 1 Test',
                type: 'TEST',
                date: now,
                totalMarks: 100,
                weight: 30
            }
        }),
        prisma.assessment.upsert({
            where: { id: 'mock-assessment-eng-assign-1' },
            update: {},
            create: {
                id: 'mock-assessment-eng-assign-1',
                subjectId: subjects[1].id,
                title: 'Creative Writing Assignment',
                type: 'ASSIGNMENT',
                date: now,
                totalMarks: 50,
                weight: 20
            }
        }),
        prisma.assessment.upsert({
            where: { id: 'mock-assessment-sci-prac-1' },
            update: {},
            create: {
                id: 'mock-assessment-sci-prac-1',
                subjectId: subjects[2].id,
                title: 'Lab Practical',
                type: 'PRACTICAL',
                date: now,
                totalMarks: 40,
                weight: 20
            }
        })
    ]);

    await Promise.all([
        prisma.grade.upsert({
            where: { assessmentId_learnerId: { assessmentId: assessments[0].id, learnerId: learnerProfile.id } },
            update: { score: 78 },
            create: { assessmentId: assessments[0].id, learnerId: learnerProfile.id, score: 78, comments: 'Good work' }
        }),
        prisma.grade.upsert({
            where: { assessmentId_learnerId: { assessmentId: assessments[1].id, learnerId: learnerProfile.id } },
            update: { score: 41 },
            create: { assessmentId: assessments[1].id, learnerId: learnerProfile.id, score: 41, comments: 'Nice creativity' }
        }),
        prisma.grade.upsert({
            where: { assessmentId_learnerId: { assessmentId: assessments[2].id, learnerId: learnerProfile.id } },
            update: { score: 32 },
            create: { assessmentId: assessments[2].id, learnerId: learnerProfile.id, score: 32, comments: 'Solid practical skills' }
        })
    ]);

    await prisma.parentProfile.upsert({
        where: { userId: 'mock-parent-1' },
        update: { learnerIds: ['mock-learner-1'] },
        create: { userId: 'mock-parent-1', learnerIds: ['mock-learner-1'] }
    });

    await Promise.all([
        prisma.notification.upsert({
            where: { id: 'mock-notification-learner-1' },
            update: {},
            create: {
                id: 'mock-notification-learner-1',
                userId: learnerUser.id,
                title: 'New assessment posted',
                message: 'Mathematics Term 1 Test has been posted.',
                type: 'ACADEMIC',
                isRead: false
            }
        }),
        prisma.notification.upsert({
            where: { id: 'mock-notification-parent-1' },
            update: {},
            create: {
                id: 'mock-notification-parent-1',
                userId: 'mock-parent-1',
                title: 'Invoice available',
                message: 'A new fee invoice has been generated for Emma Davis.',
                type: 'BILLING',
                isRead: false
            }
        }),
        prisma.notification.upsert({
            where: { id: 'mock-notification-teacher-1' },
            update: {},
            create: {
                id: 'mock-notification-teacher-1',
                userId: teacherUser.id,
                title: 'PTM booking request',
                message: 'A parent booked a meeting slot for PTM.',
                type: 'SYSTEM',
                isRead: false
            }
        })
    ]);

    await Promise.all([
        prisma.message.upsert({
            where: { id: 'mock-message-1' },
            update: {},
            create: {
                id: 'mock-message-1',
                schoolId: school.id,
                senderId: 'mock-parent-1',
                recipientId: teacherUser.id,
                subject: 'Learner progress',
                content: 'Hi teacher, could you please share feedback on recent assessments?'
            }
        }),
        prisma.message.upsert({
            where: { id: 'mock-message-2' },
            update: {},
            create: {
                id: 'mock-message-2',
                schoolId: school.id,
                senderId: teacherUser.id,
                recipientId: 'mock-parent-1',
                subject: 'Re: Learner progress',
                content: 'Sure. Emma is doing well. Please check the term report and the maths test results.'
            }
        })
    ]);

    await prisma.feeInvoice.upsert({
        where: { id: 'mock-fee-invoice-1' },
        update: {},
        create: {
            id: 'mock-fee-invoice-1',
            schoolId: school.id,
            learnerId: learnerProfile.id,
            title: 'Term 1 School Fees',
            amount: 2500,
            dueDate: new Date(new Date().setDate(new Date().getDate() + 14)),
            status: 'PENDING'
        }
    });

    await prisma.behaviorRecord.upsert({
        where: { id: 'mock-behavior-1' },
        update: {},
        create: {
            id: 'mock-behavior-1',
            learnerId: learnerProfile.id,
            teacherId: teacherUser.id,
            type: 'MERIT',
            category: 'CONDUCT',
            points: 5,
            reason: 'Helped a classmate with homework.'
        }
    });

    await Promise.all([
        prisma.resource.upsert({
            where: { id: 'mock-resource-math-1' },
            update: {},
            create: {
                id: 'mock-resource-math-1',
                subjectId: subjects[0].id,
                title: 'Algebra Practice Worksheet',
                fileUrl: 'https://example.com/algebra-worksheet.pdf',
                fileType: 'PDF'
            }
        }),
        prisma.resource.upsert({
            where: { id: 'mock-resource-eng-1' },
            update: {},
            create: {
                id: 'mock-resource-eng-1',
                subjectId: subjects[1].id,
                title: 'Creative Writing Tips',
                fileUrl: 'https://example.com/creative-writing',
                fileType: 'LINK'
            }
        })
    ]);

    const quiz = await prisma.quiz.upsert({
        where: { id: 'mock-quiz-math-1' },
        update: {},
        create: {
            id: 'mock-quiz-math-1',
            subjectId: subjects[0].id,
            title: 'Quick Algebra Quiz',
            description: '10-minute warmup quiz',
            timeLimit: 10,
            isPublished: true
        }
    });

    const q1 = await prisma.quizQuestion.upsert({
        where: { id: 'mock-quiz-q1' },
        update: {},
        create: {
            id: 'mock-quiz-q1',
            quizId: quiz.id,
            text: 'What is 2x if x = 3?',
            points: 5
        }
    });
    const q2 = await prisma.quizQuestion.upsert({
        where: { id: 'mock-quiz-q2' },
        update: {},
        create: {
            id: 'mock-quiz-q2',
            quizId: quiz.id,
            text: 'Solve: 5 + 2 = ?',
            points: 5
        }
    });

    await Promise.all([
        prisma.quizOption.upsert({
            where: { id: 'mock-quiz-q1-a' },
            update: {},
            create: { id: 'mock-quiz-q1-a', questionId: q1.id, text: '6', isCorrect: true }
        }),
        prisma.quizOption.upsert({
            where: { id: 'mock-quiz-q1-b' },
            update: {},
            create: { id: 'mock-quiz-q1-b', questionId: q1.id, text: '9', isCorrect: false }
        }),
        prisma.quizOption.upsert({
            where: { id: 'mock-quiz-q2-a' },
            update: {},
            create: { id: 'mock-quiz-q2-a', questionId: q2.id, text: '7', isCorrect: true }
        }),
        prisma.quizOption.upsert({
            where: { id: 'mock-quiz-q2-b' },
            update: {},
            create: { id: 'mock-quiz-q2-b', questionId: q2.id, text: '8', isCorrect: false }
        })
    ]);

    const attempt = await prisma.quizAttempt.upsert({
        where: { id: 'mock-quiz-attempt-1' },
        update: {},
        create: {
            id: 'mock-quiz-attempt-1',
            quizId: quiz.id,
            learnerId: learnerProfile.id,
            score: 10,
            completedAt: new Date()
        }
    });

    await Promise.all([
        prisma.quizAnswer.upsert({
            where: { id: 'mock-quiz-answer-1' },
            update: {},
            create: { id: 'mock-quiz-answer-1', attemptId: attempt.id, questionId: q1.id, selectedOptionId: 'mock-quiz-q1-a' }
        }),
        prisma.quizAnswer.upsert({
            where: { id: 'mock-quiz-answer-2' },
            update: {},
            create: { id: 'mock-quiz-answer-2', attemptId: attempt.id, questionId: q2.id, selectedOptionId: 'mock-quiz-q2-a' }
        })
    ]);

    const ptmSession = await prisma.pTMSession.upsert({
        where: { id: 'mock-ptm-session-1' },
        update: {},
        create: {
            id: 'mock-ptm-session-1',
            schoolId: school.id,
            teacherId: teacherUser.id,
            date: new Date(new Date().setDate(new Date().getDate() + 7)),
            startTime: new Date(new Date().setDate(new Date().getDate() + 7)),
            endTime: new Date(new Date(new Date().setDate(new Date().getDate() + 7)).getTime() + 60 * 60 * 1000),
            slotDuration: 10
        }
    });

    await prisma.pTMBooking.upsert({
        where: { id: 'mock-ptm-booking-1' },
        update: {},
        create: {
            id: 'mock-ptm-booking-1',
            sessionId: ptmSession.id,
            learnerId: learnerProfile.id,
            parentId: 'mock-parent-1',
            startTime: new Date(new Date().setDate(new Date().getDate() + 7)),
            endTime: new Date(new Date().setDate(new Date().getDate() + 7)),
            status: 'BOOKED'
        }
    });

    const asset = await prisma.asset.upsert({
        where: { id: 'mock-asset-1' },
        update: {},
        create: {
            id: 'mock-asset-1',
            schoolId: school.id,
            name: 'Projector A',
            category: 'Equipment',
            status: 'AVAILABLE'
        }
    });

    await prisma.assetBooking.upsert({
        where: { id: 'mock-asset-booking-1' },
        update: {},
        create: {
            id: 'mock-asset-booking-1',
            assetId: asset.id,
            userId: teacherUser.id,
            startDate: new Date(new Date().setDate(new Date().getDate() + 1)),
            endDate: new Date(new Date().setDate(new Date().getDate() + 1)),
            status: 'APPROVED'
        }
    });

    await prisma.application.upsert({
        where: { id: 'mock-application-1' },
        update: {},
        create: {
            id: 'mock-application-1',
            schoolId: school.id,
            firstName: 'New',
            lastName: 'Applicant',
            email: 'newparent@example.com',
            grade: '8',
            status: 'PENDING'
        }
    });

    const billing = await prisma.billing.upsert({
        where: { id: 'mock-billing-1' },
        update: {},
        create: {
            id: 'mock-billing-1',
            schoolId: school.id,
            periodStart: new Date(new Date().setMonth(new Date().getMonth() - 1)),
            periodEnd: new Date(),
            baseAmount: 500,
            extraLearners: 0,
            extraAmount: 0,
            totalAmount: 500,
            status: 'ACTIVE'
        }
    });

    await prisma.auditLog.upsert({
        where: { id: 'mock-audit-1' },
        update: {},
        create: {
            id: 'mock-audit-1',
            schoolId: school.id,
            userId: providerUser.id,
            action: 'SEED_DEMO_DATA',
            entity: 'SYSTEM',
            entityId: billing.id,
            details: { note: 'Seeded demo records for dashboards' }
        }
    });

    console.log('✅ Demo data created successfully!');
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
