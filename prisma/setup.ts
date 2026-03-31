import "dotenv/config";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const statements = [
  `PRAGMA foreign_keys = ON;`,
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "city" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`,
  `CREATE TABLE IF NOT EXISTS "ResponseSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "city" TEXT NOT NULL,
    "responseWindowMinutes" INTEGER NOT NULL DEFAULT 10,
    "updatedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResponseSetting_updatedById_fkey"
      FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ResponseSetting_city_key" ON "ResponseSetting"("city");`,
  `CREATE TABLE IF NOT EXISTS "CustodyAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "suspectName" TEXT NOT NULL,
    "policeStation" TEXT NOT NULL,
    "notes" TEXT,
    "custodyRecordFileName" TEXT,
    "custodyRecordStoredName" TEXT,
    "custodyRecordMimeType" TEXT,
    "custodyRecordData" BLOB,
    "custodyRecordExtract" TEXT,
    "custodyRecordSummary" TEXT,
    "custodyRecordPageCount" INTEGER,
    "custodyRecordUploadedAt" DATETIME,
    "city" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "policeOfficerId" TEXT NOT NULL,
    "currentLawyerId" TEXT,
    "acceptedLawyerId" TEXT,
    "currentAssignmentOrder" INTEGER,
    "responseDeadline" DATETIME,
    "acceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustodyAlert_policeOfficerId_fkey"
      FOREIGN KEY ("policeOfficerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustodyAlert_currentLawyerId_fkey"
      FOREIGN KEY ("currentLawyerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustodyAlert_acceptedLawyerId_fkey"
      FOREIGN KEY ("acceptedLawyerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CustodyAlert_reference_key" ON "CustodyAlert"("reference");`,
  `CREATE INDEX IF NOT EXISTS "CustodyAlert_city_status_idx" ON "CustodyAlert"("city", "status");`,
  `CREATE INDEX IF NOT EXISTS "CustodyAlert_policeOfficerId_createdAt_idx" ON "CustodyAlert"("policeOfficerId", "createdAt");`,
  `CREATE TABLE IF NOT EXISTS "DutyAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "city" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT 1,
    "lawyerId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DutyAssignment_lawyerId_fkey"
      FOREIGN KEY ("lawyerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DutyAssignment_assignedById_fkey"
      FOREIGN KEY ("assignedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "DutyAssignment_city_priority_key" ON "DutyAssignment"("city", "priority");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "DutyAssignment_city_lawyerId_key" ON "DutyAssignment"("city", "lawyerId");`,
  `CREATE TABLE IF NOT EXISTS "AlertAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alertId" TEXT NOT NULL,
    "lawyerId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" DATETIME,
    "responseDeadline" DATETIME NOT NULL,
    CONSTRAINT "AlertAssignment_alertId_fkey"
      FOREIGN KEY ("alertId") REFERENCES "CustodyAlert" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AlertAssignment_lawyerId_fkey"
      FOREIGN KEY ("lawyerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AlertAssignment_alertId_priority_key" ON "AlertAssignment"("alertId", "priority");`,
  `CREATE INDEX IF NOT EXISTS "AlertAssignment_lawyerId_status_idx" ON "AlertAssignment"("lawyerId", "status");`,
  `CREATE INDEX IF NOT EXISTS "AlertAssignment_responseDeadline_status_idx" ON "AlertAssignment"("responseDeadline", "status");`,
  `CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "alertId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SYSTEM',
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_alertId_fkey"
      FOREIGN KEY ("alertId") REFERENCES "CustodyAlert" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");`,
];

const custodyAlertColumns = [
  {
    name: "custodyRecordFileName",
    definition: `TEXT`,
  },
  {
    name: "custodyRecordStoredName",
    definition: `TEXT`,
  },
  {
    name: "custodyRecordMimeType",
    definition: `TEXT`,
  },
  {
    name: "custodyRecordData",
    definition: `BLOB`,
  },
  {
    name: "custodyRecordExtract",
    definition: `TEXT`,
  },
  {
    name: "custodyRecordSummary",
    definition: `TEXT`,
  },
  {
    name: "custodyRecordPageCount",
    definition: `INTEGER`,
  },
  {
    name: "custodyRecordUploadedAt",
    definition: `DATETIME`,
  },
] as const;

async function ensureColumn(
  tableName: string,
  columnName: string,
  definition: string,
) {
  const columns = (await prisma.$queryRawUnsafe(
    `PRAGMA table_info("${tableName}")`,
  )) as Array<{ name: string }>;

  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${definition};`,
  );
}

async function main() {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }

  for (const column of custodyAlertColumns) {
    await ensureColumn("CustodyAlert", column.name, column.definition);
  }
}

main()
  .then(async () => {
    console.log("Database schema ensured.");
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
