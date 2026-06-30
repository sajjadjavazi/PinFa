-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'TRUSTED_USER', 'MODERATOR', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED');

-- CreateEnum
CREATE TYPE "PinStatus" AS ENUM ('DRAFT', 'PROCESSING', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'REMOVED', 'DELETED');

-- CreateEnum
CREATE TYPE "ImageStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'READY', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "BoardVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "CategoryStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "Likelihood" AS ENUM ('UNKNOWN', 'VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY');

-- CreateEnum
CREATE TYPE "ModerationDecision" AS ENUM ('AUTO_APPROVED', 'AUTO_REJECTED', 'HUMAN_REVIEW_REQUIRED', 'MANUALLY_APPROVED', 'MANUALLY_REJECTED', 'REMOVED');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('PIN', 'USER', 'BOARD');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('ADULT_CONTENT', 'NUDITY', 'SEXUAL_CONTENT', 'RACY_CONTENT', 'VIOLENCE', 'MEDICAL_SENSITIVE', 'SPAM', 'HARASSMENT', 'ILLEGAL_CONTENT', 'COPYRIGHT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "UserEventType" AS ENUM ('VIEW_PIN', 'OPEN_PIN', 'LIKE_PIN', 'UNLIKE_PIN', 'SAVE_PIN', 'UNSAVE_PIN', 'CREATE_BOARD', 'FOLLOW_USER', 'UNFOLLOW_USER', 'FOLLOW_BOARD', 'UNFOLLOW_BOARD', 'FOLLOW_CATEGORY', 'UNFOLLOW_CATEGORY', 'SEARCH', 'SHARE_PIN', 'REPORT_PIN', 'HIDE_PIN', 'NOT_INTERESTED', 'CLICK_AD');

-- CreateEnum
CREATE TYPE "UserInterestSource" AS ENUM ('ONBOARDING', 'VIEW', 'LIKE', 'SAVE', 'FOLLOW', 'SEARCH', 'ADMIN_SEED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('USER_FOLLOWED_YOU', 'PIN_LIKED', 'PIN_SAVED', 'PIN_APPROVED', 'PIN_REJECTED', 'REPORT_RESOLVED', 'ADMIN_WARNING', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AdProvider" AS ENUM ('YEKTANET', 'INTERNAL', 'DIRECT', 'AFFILIATE');

-- CreateEnum
CREATE TYPE "AdPlacement" AS ENUM ('HOME_FEED_INLINE', 'PIN_DETAIL_RELATED', 'SEARCH_INLINE', 'CATEGORY_FEED_INLINE');

-- CreateEnum
CREATE TYPE "AdEventType" AS ENUM ('AD_SLOT_REQUESTED', 'AD_SLOT_RENDERED', 'AD_IMPRESSION_ATTEMPTED', 'AD_CLICKED', 'AD_FAILED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('PIN_APPROVED', 'PIN_REJECTED', 'PIN_REMOVED', 'PIN_RESTORED', 'USER_SUSPENDED', 'USER_BANNED', 'USER_RESTORED', 'REPORT_RESOLVED', 'CATEGORY_CREATED', 'CATEGORY_UPDATED', 'CATEGORY_DISABLED', 'MODERATION_SETTING_UPDATED', 'AD_SETTING_UPDATED', 'ADMIN_LOGIN', 'SYSTEM_CHANGE');

-- CreateEnum
CREATE TYPE "VerificationChannel" AS ENUM ('EMAIL', 'PHONE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "websiteUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "trustScore" INTEGER NOT NULL DEFAULT 0,
    "termsAcceptedAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "followingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "VerificationChannel" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "status" "CategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pin" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "categoryId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "PinStatus" NOT NULL DEFAULT 'PROCESSING',
    "imageOriginalUrl" TEXT,
    "imageThumbnailUrl" TEXT,
    "imageFeedUrl" TEXT,
    "imageDetailUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "dominantColor" TEXT,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "saveCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageAsset" (
    "id" TEXT NOT NULL,
    "pinId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "status" "ImageStatus" NOT NULL DEFAULT 'UPLOADED',
    "originalStorageKey" TEXT,
    "thumbnailStorageKey" TEXT,
    "feedStorageKey" TEXT,
    "detailStorageKey" TEXT,
    "mimeType" TEXT NOT NULL,
    "originalSizeBytes" INTEGER NOT NULL,
    "processedSizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImageAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationResult" (
    "id" TEXT NOT NULL,
    "pinId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'google_vision_safe_search',
    "adultLikelihood" "Likelihood" NOT NULL DEFAULT 'UNKNOWN',
    "racyLikelihood" "Likelihood" NOT NULL DEFAULT 'UNKNOWN',
    "violenceLikelihood" "Likelihood" NOT NULL DEFAULT 'UNKNOWN',
    "medicalLikelihood" "Likelihood" NOT NULL DEFAULT 'UNKNOWN',
    "spoofLikelihood" "Likelihood" NOT NULL DEFAULT 'UNKNOWN',
    "decision" "ModerationDecision" NOT NULL,
    "rawResponseJson" JSONB,
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Board" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "BoardVisibility" NOT NULL DEFAULT 'PUBLIC',
    "coverPinId" TEXT,
    "pinCount" INTEGER NOT NULL DEFAULT 0,
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardPin" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "pinId" TEXT NOT NULL,
    "savedByUserId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoardPin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pinId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFollow" (
    "id" TEXT NOT NULL,
    "followerUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoardFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInterest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" "UserInterestSource" NOT NULL DEFAULT 'SYSTEM',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "eventType" "UserEventType" NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "actorId" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdSlot" (
    "id" TEXT NOT NULL,
    "placement" "AdPlacement" NOT NULL,
    "provider" "AdProvider" NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "frequencyEvery" INTEGER NOT NULL DEFAULT 6,
    "providerConfigJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "slotId" TEXT,
    "sessionId" TEXT,
    "provider" "AdProvider" NOT NULL,
    "placement" "AdPlacement" NOT NULL,
    "eventType" "AdEventType" NOT NULL,
    "adReference" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" "AuditAction" NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "oldValueJson" JSONB,
    "newValueJson" JSONB,
    "note" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_sessionTokenHash_key" ON "UserSession"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccountVerificationToken_tokenHash_key" ON "AccountVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AccountVerificationToken_userId_idx" ON "AccountVerificationToken"("userId");

-- CreateIndex
CREATE INDEX "AccountVerificationToken_channel_idx" ON "AccountVerificationToken"("channel");

-- CreateIndex
CREATE INDEX "AccountVerificationToken_target_idx" ON "AccountVerificationToken"("target");

-- CreateIndex
CREATE INDEX "AccountVerificationToken_expiresAt_idx" ON "AccountVerificationToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_status_idx" ON "Category"("status");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Pin_ownerUserId_idx" ON "Pin"("ownerUserId");

-- CreateIndex
CREATE INDEX "Pin_categoryId_idx" ON "Pin"("categoryId");

-- CreateIndex
CREATE INDEX "Pin_status_idx" ON "Pin"("status");

-- CreateIndex
CREATE INDEX "Pin_createdAt_idx" ON "Pin"("createdAt");

-- CreateIndex
CREATE INDEX "Pin_likeCount_idx" ON "Pin"("likeCount");

-- CreateIndex
CREATE INDEX "Pin_saveCount_idx" ON "Pin"("saveCount");

-- CreateIndex
CREATE INDEX "Pin_reportCount_idx" ON "Pin"("reportCount");

-- CreateIndex
CREATE UNIQUE INDEX "ImageAsset_pinId_key" ON "ImageAsset"("pinId");

-- CreateIndex
CREATE INDEX "ImageAsset_ownerUserId_idx" ON "ImageAsset"("ownerUserId");

-- CreateIndex
CREATE INDEX "ImageAsset_status_idx" ON "ImageAsset"("status");

-- CreateIndex
CREATE INDEX "ModerationResult_pinId_idx" ON "ModerationResult"("pinId");

-- CreateIndex
CREATE INDEX "ModerationResult_decision_idx" ON "ModerationResult"("decision");

-- CreateIndex
CREATE INDEX "ModerationResult_createdAt_idx" ON "ModerationResult"("createdAt");

-- CreateIndex
CREATE INDEX "ModerationResult_reviewedById_idx" ON "ModerationResult"("reviewedById");

-- CreateIndex
CREATE INDEX "Board_ownerUserId_idx" ON "Board"("ownerUserId");

-- CreateIndex
CREATE INDEX "Board_visibility_idx" ON "Board"("visibility");

-- CreateIndex
CREATE INDEX "Board_createdAt_idx" ON "Board"("createdAt");

-- CreateIndex
CREATE INDEX "BoardPin_pinId_idx" ON "BoardPin"("pinId");

-- CreateIndex
CREATE INDEX "BoardPin_savedByUserId_idx" ON "BoardPin"("savedByUserId");

-- CreateIndex
CREATE INDEX "BoardPin_createdAt_idx" ON "BoardPin"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BoardPin_boardId_pinId_key" ON "BoardPin"("boardId", "pinId");

-- CreateIndex
CREATE INDEX "Like_pinId_idx" ON "Like"("pinId");

-- CreateIndex
CREATE INDEX "Like_createdAt_idx" ON "Like"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Like_userId_pinId_key" ON "Like"("userId", "pinId");

-- CreateIndex
CREATE INDEX "UserFollow_targetUserId_idx" ON "UserFollow"("targetUserId");

-- CreateIndex
CREATE INDEX "UserFollow_createdAt_idx" ON "UserFollow"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserFollow_followerUserId_targetUserId_key" ON "UserFollow"("followerUserId", "targetUserId");

-- CreateIndex
CREATE INDEX "BoardFollow_boardId_idx" ON "BoardFollow"("boardId");

-- CreateIndex
CREATE INDEX "BoardFollow_createdAt_idx" ON "BoardFollow"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BoardFollow_userId_boardId_key" ON "BoardFollow"("userId", "boardId");

-- CreateIndex
CREATE INDEX "CategoryFollow_categoryId_idx" ON "CategoryFollow"("categoryId");

-- CreateIndex
CREATE INDEX "CategoryFollow_createdAt_idx" ON "CategoryFollow"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryFollow_userId_categoryId_key" ON "CategoryFollow"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "UserInterest_userId_idx" ON "UserInterest"("userId");

-- CreateIndex
CREATE INDEX "UserInterest_categoryId_idx" ON "UserInterest"("categoryId");

-- CreateIndex
CREATE INDEX "UserInterest_score_idx" ON "UserInterest"("score");

-- CreateIndex
CREATE UNIQUE INDEX "UserInterest_userId_categoryId_key" ON "UserInterest"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "UserEvent_userId_idx" ON "UserEvent"("userId");

-- CreateIndex
CREATE INDEX "UserEvent_sessionId_idx" ON "UserEvent"("sessionId");

-- CreateIndex
CREATE INDEX "UserEvent_eventType_idx" ON "UserEvent"("eventType");

-- CreateIndex
CREATE INDEX "UserEvent_targetType_targetId_idx" ON "UserEvent"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "UserEvent_createdAt_idx" ON "UserEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Report_reporterUserId_idx" ON "Report"("reporterUserId");

-- CreateIndex
CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Report_reporterUserId_targetType_targetId_reason_key" ON "Report"("reporterUserId", "targetType", "targetId", "reason");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "AdSlot_placement_idx" ON "AdSlot"("placement");

-- CreateIndex
CREATE INDEX "AdSlot_provider_idx" ON "AdSlot"("provider");

-- CreateIndex
CREATE INDEX "AdSlot_isActive_idx" ON "AdSlot"("isActive");

-- CreateIndex
CREATE INDEX "AdEvent_userId_idx" ON "AdEvent"("userId");

-- CreateIndex
CREATE INDEX "AdEvent_slotId_idx" ON "AdEvent"("slotId");

-- CreateIndex
CREATE INDEX "AdEvent_sessionId_idx" ON "AdEvent"("sessionId");

-- CreateIndex
CREATE INDEX "AdEvent_provider_idx" ON "AdEvent"("provider");

-- CreateIndex
CREATE INDEX "AdEvent_placement_idx" ON "AdEvent"("placement");

-- CreateIndex
CREATE INDEX "AdEvent_eventType_idx" ON "AdEvent"("eventType");

-- CreateIndex
CREATE INDEX "AdEvent_createdAt_idx" ON "AdEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountVerificationToken" ADD CONSTRAINT "AccountVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pin" ADD CONSTRAINT "Pin_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pin" ADD CONSTRAINT "Pin_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageAsset" ADD CONSTRAINT "ImageAsset_pinId_fkey" FOREIGN KEY ("pinId") REFERENCES "Pin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageAsset" ADD CONSTRAINT "ImageAsset_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationResult" ADD CONSTRAINT "ModerationResult_pinId_fkey" FOREIGN KEY ("pinId") REFERENCES "Pin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationResult" ADD CONSTRAINT "ModerationResult_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Board" ADD CONSTRAINT "Board_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Board" ADD CONSTRAINT "Board_coverPinId_fkey" FOREIGN KEY ("coverPinId") REFERENCES "Pin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardPin" ADD CONSTRAINT "BoardPin_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardPin" ADD CONSTRAINT "BoardPin_pinId_fkey" FOREIGN KEY ("pinId") REFERENCES "Pin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardPin" ADD CONSTRAINT "BoardPin_savedByUserId_fkey" FOREIGN KEY ("savedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_pinId_fkey" FOREIGN KEY ("pinId") REFERENCES "Pin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_followerUserId_fkey" FOREIGN KEY ("followerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardFollow" ADD CONSTRAINT "BoardFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardFollow" ADD CONSTRAINT "BoardFollow_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryFollow" ADD CONSTRAINT "CategoryFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryFollow" ADD CONSTRAINT "CategoryFollow_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInterest" ADD CONSTRAINT "UserInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInterest" ADD CONSTRAINT "UserInterest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEvent" ADD CONSTRAINT "UserEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdEvent" ADD CONSTRAINT "AdEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdEvent" ADD CONSTRAINT "AdEvent_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "AdSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

