-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('chamber_and_hall_self_contain', 'chamber_and_hall', 'single_room_self_contain', 'single_room', 'self_contain_studio', 'boys_quarters', 'hostel_bed', 'bedroom_1', 'bedroom_2', 'bedroom_3', 'bedroom_4_plus');

-- CreateEnum
CREATE TYPE "WaterSource" AS ENUM ('gwcl', 'borehole', 'tanker');

-- CreateEnum
CREATE TYPE "MeterArrangement" AS ENUM ('self', 'shared', 'prepaid');

-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('api', 'feed', 'crawl', 'user_paste', 'agent_direct');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('open', 'actioned', 'dismissed');

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Town" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "hubTownId" TEXT,
    "hubDistanceM" INTEGER,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "sub" TEXT NOT NULL,

    CONSTRAINT "Town_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "townId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Landmark" (
    "id" TEXT NOT NULL,
    "townId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,

    CONSTRAINT "Landmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "SourceKind" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "robotsCheckedAt" TIMESTAMP(3),
    "mayStoreContact" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cluster" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "townId" TEXT NOT NULL,
    "areaId" TEXT,
    "unitType" "UnitType" NOT NULL,
    "nearestLandmarkId" TEXT,
    "approxDistanceM" INTEGER,
    "water" "WaterSource",
    "waterDays" INTEGER,
    "polytank" BOOLEAN,
    "meter" "MeterArrangement",
    "toilet" TEXT,
    "bathroom" TEXT,
    "kitchen" TEXT,
    "gated" BOOLEAN,
    "directions" TEXT,
    "photoCount" INTEGER NOT NULL DEFAULT 0,
    "thumbnailUrl" TEXT,
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL,
    "rentMin" INTEGER,
    "rentMax" INTEGER,
    "advanceMonthsMin" INTEGER,
    "advanceMonthsMax" INTEGER,
    "totalToMoveInMin" INTEGER,
    "totalToMoveInMax" INTEGER,
    "sourceCount" INTEGER NOT NULL DEFAULT 0,
    "mapX" INTEGER NOT NULL DEFAULT 50,
    "mapY" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "monthlyRent" INTEGER,
    "advanceMonths" INTEGER,
    "agentFee" INTEGER,
    "agentName" TEXT,
    "agentPhone" TEXT,
    "reacLicensed" BOOLEAN,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL,
    "goneAt" TIMESTAMP(3),
    "rawTitle" TEXT NOT NULL,
    "rawBody" TEXT NOT NULL,
    "lawfulBasisNote" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingEvent" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "previousRent" INTEGER,
    "newRent" INTEGER,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MergeDecision" (
    "id" TEXT NOT NULL,
    "aId" TEXT NOT NULL,
    "bId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "merged" BOOLEAN NOT NULL,
    "reasons" TEXT[],
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overriddenBy" TEXT,

    CONSTRAINT "MergeDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT,
    "reason" TEXT NOT NULL,
    "freeText" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'open',
    "outcomeNote" TEXT,
    "filedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actionedAt" TIMESTAMP(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErasureRequest" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "note" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "listingsAffected" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ErasureRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestRun" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "yield" INTEGER NOT NULL,
    "parseFailures" INTEGER NOT NULL DEFAULT 0,
    "robotsBlocked" INTEGER NOT NULL DEFAULT 0,
    "meanAgeAtIndexHours" DOUBLE PRECISION,
    "ok" BOOLEAN NOT NULL,
    "error" TEXT,

    CONSTRAINT "IngestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "alertsOn" BOOLEAN NOT NULL DEFAULT true,
    "lastDigestAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortlistEntry" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "rating" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Not contacted',
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShortlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Region_slug_key" ON "Region"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Town_slug_key" ON "Town"("slug");

-- CreateIndex
CREATE INDEX "Town_regionId_idx" ON "Town"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "Area_slug_key" ON "Area"("slug");

-- CreateIndex
CREATE INDEX "Area_townId_idx" ON "Area"("townId");

-- CreateIndex
CREATE INDEX "Landmark_townId_idx" ON "Landmark"("townId");

-- CreateIndex
CREATE UNIQUE INDEX "Landmark_townId_name_key" ON "Landmark"("townId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Cluster_slug_key" ON "Cluster"("slug");

-- CreateIndex
CREATE INDEX "Cluster_townId_unitType_idx" ON "Cluster"("townId", "unitType");

-- CreateIndex
CREATE INDEX "Cluster_townId_totalToMoveInMin_idx" ON "Cluster"("townId", "totalToMoveInMin");

-- CreateIndex
CREATE INDEX "Cluster_lastVerifiedAt_idx" ON "Cluster"("lastVerifiedAt");

-- CreateIndex
CREATE INDEX "Listing_clusterId_idx" ON "Listing"("clusterId");

-- CreateIndex
CREATE INDEX "Listing_goneAt_idx" ON "Listing"("goneAt");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_sourceId_sourceUrl_key" ON "Listing"("sourceId", "sourceUrl");

-- CreateIndex
CREATE INDEX "ListingEvent_clusterId_at_idx" ON "ListingEvent"("clusterId", "at");

-- CreateIndex
CREATE INDEX "ListingEvent_kind_at_idx" ON "ListingEvent"("kind", "at");

-- CreateIndex
CREATE INDEX "MergeDecision_at_idx" ON "MergeDecision"("at");

-- CreateIndex
CREATE INDEX "Report_status_filedAt_idx" ON "Report"("status", "filedAt");

-- CreateIndex
CREATE INDEX "ErasureRequest_requestedAt_idx" ON "ErasureRequest"("requestedAt");

-- CreateIndex
CREATE INDEX "IngestRun_sourceId_finishedAt_idx" ON "IngestRun"("sourceId", "finishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Account_phoneE164_key" ON "Account"("phoneE164");

-- CreateIndex
CREATE UNIQUE INDEX "SavedSearch_accountId_query_key" ON "SavedSearch"("accountId", "query");

-- CreateIndex
CREATE INDEX "ShortlistEntry_accountId_verdict_idx" ON "ShortlistEntry"("accountId", "verdict");

-- CreateIndex
CREATE UNIQUE INDEX "ShortlistEntry_accountId_clusterId_key" ON "ShortlistEntry"("accountId", "clusterId");

-- AddForeignKey
ALTER TABLE "Town" ADD CONSTRAINT "Town_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Town" ADD CONSTRAINT "Town_hubTownId_fkey" FOREIGN KEY ("hubTownId") REFERENCES "Town"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_townId_fkey" FOREIGN KEY ("townId") REFERENCES "Town"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Landmark" ADD CONSTRAINT "Landmark_townId_fkey" FOREIGN KEY ("townId") REFERENCES "Town"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cluster" ADD CONSTRAINT "Cluster_townId_fkey" FOREIGN KEY ("townId") REFERENCES "Town"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cluster" ADD CONSTRAINT "Cluster_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cluster" ADD CONSTRAINT "Cluster_nearestLandmarkId_fkey" FOREIGN KEY ("nearestLandmarkId") REFERENCES "Landmark"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "Cluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingEvent" ADD CONSTRAINT "ListingEvent_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingEvent" ADD CONSTRAINT "ListingEvent_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "Cluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "Cluster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortlistEntry" ADD CONSTRAINT "ShortlistEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

