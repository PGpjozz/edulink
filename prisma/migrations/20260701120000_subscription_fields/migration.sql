-- Subscription & tuition fields required by BrightCampus pricing (safe to re-run)

DO $$ BEGIN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "tuitionFee" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING';
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3);
