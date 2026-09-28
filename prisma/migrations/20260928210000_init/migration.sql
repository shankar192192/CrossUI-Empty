-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SALESPERSON');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('NEW_LEAD', 'DEMO_SCHEDULED', 'FOLLOW_UP', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('LEAD_CREATED', 'NOTE', 'REQUIREMENT_UPDATED', 'STATUS_CHANGED', 'DEMO_SCHEDULED', 'DEMO_COMPLETED', 'FOLLOW_UP_SCHEDULED', 'FOLLOW_UP_LOGGED', 'TIMEZONE_UPDATED', 'CONVERTED', 'PAYMENT_RECORDED', 'CLIENT_UPDATED');

-- CreateEnum
CREATE TYPE "FollowUpOutcome" AS ENUM ('FOLLOWED_UP_NEXT_DAY', 'FOLLOWED_UP_SPECIFIC_DATE', 'DEMO_COMPLETED', 'CONVERTED', 'LOST');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SALESPERSON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "country" TEXT,
    "countryName" TEXT,
    "timezone" TEXT,
    "timezoneSource" TEXT NOT NULL DEFAULT 'UNDETERMINED',
    "timezoneConfident" BOOLEAN NOT NULL DEFAULT false,
    "requirement" TEXT,
    "notes" TEXT,
    "leadSourceId" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'NEW_LEAD',
    "dateAdded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "demoAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "followUpPriority" BOOLEAN NOT NULL DEFAULT false,
    "convertedAt" TIMESTAMP(3),
    "productService" TEXT,
    "totalRevenue" DECIMAL(14,2),
    "totalCost" DECIMAL(14,2),
    "amountReceived" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paymentDueDate" TIMESTAMP(3),
    "conversionNotes" TEXT,
    "lostReason" TEXT,
    "lostAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "outcome" "FollowUpOutcome" NOT NULL,
    "note" TEXT,
    "nextFollowUpAt" TIMESTAMP(3),
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "message" TEXT NOT NULL,
    "actorId" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LeadSource_name_key" ON "LeadSource"("name");

-- CreateIndex
CREATE INDEX "Client_phone_idx" ON "Client"("phone");

-- CreateIndex
CREATE INDEX "Client_email_idx" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Client_status_idx" ON "Client"("status");

-- CreateIndex
CREATE INDEX "Client_country_idx" ON "Client"("country");

-- CreateIndex
CREATE INDEX "Client_timezone_idx" ON "Client"("timezone");

-- CreateIndex
CREATE INDEX "Client_leadSourceId_idx" ON "Client"("leadSourceId");

-- CreateIndex
CREATE INDEX "Client_dateAdded_idx" ON "Client"("dateAdded");

-- CreateIndex
CREATE INDEX "Client_convertedAt_idx" ON "Client"("convertedAt");

-- CreateIndex
CREATE INDEX "Client_nextFollowUpAt_idx" ON "Client"("nextFollowUpAt");

-- CreateIndex
CREATE INDEX "FollowUpLog_clientId_idx" ON "FollowUpLog"("clientId");

-- CreateIndex
CREATE INDEX "FollowUpLog_occurredAt_idx" ON "FollowUpLog"("occurredAt");

-- CreateIndex
CREATE INDEX "Payment_clientId_idx" ON "Payment"("clientId");

-- CreateIndex
CREATE INDEX "Payment_paidAt_idx" ON "Payment"("paidAt");

-- CreateIndex
CREATE INDEX "Activity_clientId_idx" ON "Activity"("clientId");

-- CreateIndex
CREATE INDEX "Activity_occurredAt_idx" ON "Activity"("occurredAt");

-- CreateIndex
CREATE INDEX "Activity_type_idx" ON "Activity"("type");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_leadSourceId_fkey" FOREIGN KEY ("leadSourceId") REFERENCES "LeadSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpLog" ADD CONSTRAINT "FollowUpLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

