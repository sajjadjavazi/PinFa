# Database Schema Documentation

# Persian Visual Discovery Platform — MVP v1.0

## 1. Purpose

This document describes the database schema for the MVP version of the Persian Visual Discovery Platform.

The platform is a web-based image discovery and mood-board product inspired by common visual discovery patterns such as image feeds, boards, saves, likes, follows, personalized recommendations, moderation, and native ads.

The database is designed for:

* User accounts and authentication.
* User profiles.
* Image-based Pins.
* Image processing metadata.
* Boards and saved Pins.
* Likes and follows.
* Categories and interests.
* Home feed personalization.
* Content moderation.
* Reports.
* Native advertising.
* Notifications.
* Admin actions and audit logs.
* System settings.

The implementation target is:

* PostgreSQL
* Prisma ORM
* Next.js / TypeScript backend

---

## 2. Database Design Principles

## 2.1 MVP-Ready but Scalable

The schema is designed to support the MVP without over-engineering. It includes enough structure to avoid major rewrites later, but excludes non-MVP features such as video, direct messaging, payment, marketplace, and advanced creator monetization.

## 2.2 Content Safety First

Uploaded images must not become public immediately. Every image must pass through the processing and moderation pipeline before appearing in public feeds, search, profiles, or boards.

## 2.3 Image and Product Separation

A `Pin` represents the product-level image post.
An `ImageAsset` represents the technical file-level metadata such as storage keys, image variants, MIME type, file size, processing state, and dimensions.

This separation makes image processing, CDN migration, and storage management easier.

## 2.4 Feed Is Generated, Not Stored

The MVP does not store a permanent personalized feed table. The feed is generated from:

* Published Pins
* User interests
* User events
* Likes
* Saves
* Follows
* Categories
* Ad slots

A cached or precomputed feed table may be added later if traffic grows.

## 2.5 Provider Abstraction

External integrations such as Google Vision SafeSearch and Yektanet native ads should be stored and handled in a provider-neutral way.

Examples:

* `ModerationResult.provider`
* `AdSlot.provider`
* `AdEvent.provider`

This allows future replacement of Google Vision, Yektanet, or any other third-party service.

---

## 3. Core Domains

The schema is divided into the following domains:

1. User & Authentication
2. Category
3. Pins & Images
4. Moderation
5. Boards & Saves
6. Likes & Follows
7. Interests & Events
8. Reports
9. Notifications
10. Ads
11. Audit Logs
12. System Settings

---

# 4. User & Authentication Domain

## 4.1 User

The `User` model stores the main account and profile information.

### Responsibilities

The `User` table supports:

* Account identity.
* Login credentials.
* Public profile.
* Role-based permissions.
* Account status.
* Trust score.
* Relations to Pins, Boards, Likes, Saves, Follows, Reports, Notifications, Events, and Admin actions.

### Main Fields

| Field        | Type       | Description                  |
| ------------ | ---------- | ---------------------------- |
| id           | String     | Unique user ID               |
| username     | String     | Unique public username       |
| displayName  | String     | Public display name          |
| email        | String?    | Optional unique email        |
| phone        | String?    | Optional unique phone number |
| passwordHash | String     | Hashed password              |
| avatarUrl    | String?    | User avatar URL              |
| bio          | String?    | User biography               |
| websiteUrl   | String?    | Optional profile website     |
| role         | UserRole   | User permission level        |
| status       | UserStatus | Account status               |
| trustScore   | Int        | Internal trust score         |
| createdAt    | DateTime   | Creation timestamp           |
| updatedAt    | DateTime   | Update timestamp             |

### User Roles

`UserRole` values:

* `USER`
* `TRUSTED_USER`
* `MODERATOR`
* `SUPER_ADMIN`

### User Statuses

`UserStatus` values:

* `ACTIVE`
* `SUSPENDED`
* `BANNED`
* `DELETED`

### Notes

* `passwordHash` must never be returned in API responses.
* A user can have either email, phone, or both depending on the authentication strategy.
* `trustScore` can be used later to reduce manual moderation for reliable uploaders.

---

## 4.2 UserSession

The `UserSession` model stores active login sessions.

### Responsibilities

It supports:

* Session-based authentication.
* Device/session tracking.
* Session expiration.
* Logout functionality.

### Main Fields

| Field            | Type     | Description          |
| ---------------- | -------- | -------------------- |
| id               | String   | Unique session ID    |
| userId           | String   | Owner user ID        |
| sessionTokenHash | String   | Hashed session token |
| deviceInfo       | String?  | Device/browser info  |
| ipAddress        | String?  | IP address           |
| expiresAt        | DateTime | Session expiration   |
| createdAt        | DateTime | Creation timestamp   |

### Rules

* Store only a hashed session token.
* Expired sessions must not authenticate users.
* Logging out should delete or invalidate the session.

---

# 5. Category Domain

## 5.1 Category

The `Category` model represents content topics such as Home Decor, Fashion, Beauty, Food, Travel, Photography, and Art.

### Responsibilities

Categories are used for:

* Pin classification.
* Onboarding interest selection.
* Personalized feed ranking.
* Search filtering.
* Category feeds.
* Sensitive content handling.

### Main Fields

| Field       | Type           | Description                   |
| ----------- | -------------- | ----------------------------- |
| id          | String         | Unique category ID            |
| name        | String         | Display name                  |
| slug        | String         | URL-safe unique slug          |
| description | String?        | Category description          |
| iconUrl     | String?        | Optional icon                 |
| isSensitive | Boolean        | Whether category is sensitive |
| status      | CategoryStatus | Active or disabled            |
| parentId    | String?        | Parent category ID            |
| createdAt   | DateTime       | Creation timestamp            |
| updatedAt   | DateTime       | Update timestamp              |

### Category Statuses

`CategoryStatus` values:

* `ACTIVE`
* `DISABLED`

### Notes

* Categories support a parent-child structure.
* Sensitive categories can trigger stricter moderation.
* Disabled categories should not be shown in onboarding or public filters.

---

# 6. Pins & Images Domain

## 6.1 Pin

The `Pin` model represents a public or pending image post.

### Responsibilities

A Pin supports:

* Image discovery.
* Pin detail page.
* Feed rendering.
* Search.
* Like/save/share/report counters.
* Ownership.
* Category classification.
* Public/pending/removed status.

### Main Fields

| Field             | Type      | Description               |
| ----------------- | --------- | ------------------------- |
| id                | String    | Unique Pin ID             |
| ownerUserId       | String    | Uploader user ID          |
| categoryId        | String?   | Category ID               |
| title             | String    | Pin title                 |
| description       | String?   | Pin description           |
| status            | PinStatus | Publication status        |
| imageOriginalUrl  | String?   | Original image URL        |
| imageThumbnailUrl | String?   | Thumbnail image URL       |
| imageFeedUrl      | String?   | Feed image URL            |
| imageDetailUrl    | String?   | Detail page image URL     |
| width             | Int?      | Image width               |
| height            | Int?      | Image height              |
| dominantColor     | String?   | Optional dominant color   |
| likeCount         | Int       | Denormalized like count   |
| saveCount         | Int       | Denormalized save count   |
| shareCount        | Int       | Denormalized share count  |
| reportCount       | Int       | Denormalized report count |
| viewCount         | Int       | Denormalized view count   |
| createdAt         | DateTime  | Creation timestamp        |
| updatedAt         | DateTime  | Update timestamp          |

### Pin Statuses

`PinStatus` values:

* `DRAFT`
* `PROCESSING`
* `PENDING_REVIEW`
* `PUBLISHED`
* `REJECTED`
* `REMOVED`
* `DELETED`

### Publication Rule

Only Pins with status `PUBLISHED` can appear in:

* Home Feed
* Category Feed
* Search Results
* Public Profile
* Public Board
* Similar Pins

### Notes

* Public UI should use `imageFeedUrl` or `imageDetailUrl`, never the raw original image.
* Counts are denormalized for performance and must be updated transactionally.

---

## 6.2 ImageAsset

The `ImageAsset` model stores technical information about the uploaded image and its processed variants.

### Responsibilities

It supports:

* Upload processing.
* File validation.
* Image variant generation.
* Storage key tracking.
* Processing error tracking.
* Image metadata.

### Main Fields

| Field               | Type        | Description                        |
| ------------------- | ----------- | ---------------------------------- |
| id                  | String      | Unique image asset ID              |
| pinId               | String      | Associated Pin ID                  |
| ownerUserId         | String      | Uploader user ID                   |
| status              | ImageStatus | Processing status                  |
| originalStorageKey  | String?     | Original file storage key          |
| thumbnailStorageKey | String?     | Thumbnail variant key              |
| feedStorageKey      | String?     | Feed variant key                   |
| detailStorageKey    | String?     | Detail variant key                 |
| mimeType            | String      | MIME type                          |
| originalSizeBytes   | Int         | Raw upload size                    |
| processedSizeBytes  | Int?        | Processed file size                |
| width               | Int?        | Image width                        |
| height              | Int?        | Image height                       |
| processingError     | String?     | Error message if processing failed |
| createdAt           | DateTime    | Creation timestamp                 |
| updatedAt           | DateTime    | Update timestamp                   |

### Image Statuses

`ImageStatus` values:

* `UPLOADED`
* `PROCESSING`
* `READY`
* `FAILED`
* `DELETED`

### Image Variants

The image pipeline should generate:

1. `thumbnail`
2. `feed`
3. `detail`
4. `original_protected`

### Notes

* `original_protected` should not be publicly exposed.
* Public pages should use optimized variants.
* Image processing should be retryable.

---

# 7. Moderation Domain

## 7.1 ModerationResult

The `ModerationResult` model stores the output of automated and manual content moderation.

### Responsibilities

It supports:

* Google Vision SafeSearch result storage.
* Human review decisions.
* Moderation auditability.
* AI moderation provider tracking.
* Admin override.

### Main Fields

| Field              | Type               | Description                 |
| ------------------ | ------------------ | --------------------------- |
| id                 | String             | Unique moderation result ID |
| pinId              | String             | Related Pin ID              |
| provider           | String             | Moderation provider         |
| adultLikelihood    | Likelihood         | Adult content likelihood    |
| racyLikelihood     | Likelihood         | Racy content likelihood     |
| violenceLikelihood | Likelihood         | Violence likelihood         |
| medicalLikelihood  | Likelihood         | Medical content likelihood  |
| spoofLikelihood    | Likelihood         | Spoof likelihood            |
| decision           | ModerationDecision | Decision result             |
| rawResponseJson    | Json?              | Raw provider response       |
| reviewedById       | String?            | Admin reviewer ID           |
| reviewNote         | String?            | Admin note                  |
| createdAt          | DateTime           | Creation timestamp          |

### SafeSearch Likelihood Values

`Likelihood` values:

* `UNKNOWN`
* `VERY_UNLIKELY`
* `UNLIKELY`
* `POSSIBLE`
* `LIKELY`
* `VERY_LIKELY`

### Moderation Decisions

`ModerationDecision` values:

* `AUTO_APPROVED`
* `AUTO_REJECTED`
* `HUMAN_REVIEW_REQUIRED`
* `MANUALLY_APPROVED`
* `MANUALLY_REJECTED`
* `REMOVED`

### Default Decision Rules

Initial MVP rules:

1. `adult = LIKELY` or `VERY_LIKELY` → reject.
2. `racy = LIKELY` or `VERY_LIKELY` → reject.
3. `violence = LIKELY` or `VERY_LIKELY` → reject.
4. `medical = LIKELY` or `VERY_LIKELY` → human review.
5. `adult`, `racy`, or `violence = POSSIBLE` → human review.
6. `UNKNOWN` in critical fields → human review.
7. Safe values → auto approve.
8. Admin decision can override automated decision.

### Notes

* If Google Vision fails, the Pin should enter `PENDING_REVIEW`.
* Manual review should update both `ModerationResult` and `Pin.status`.

---

# 8. Boards & Saves Domain

## 8.1 Board

The `Board` model represents a user-created collection of saved Pins.

### Responsibilities

Boards support:

* Personal organization.
* Public collections.
* Saved Pins.
* Board following.
* Profile board tab.
* Future content discovery.

### Main Fields

| Field         | Type            | Description                  |
| ------------- | --------------- | ---------------------------- |
| id            | String          | Unique board ID              |
| ownerUserId   | String          | Board owner                  |
| title         | String          | Board title                  |
| description   | String?         | Board description            |
| visibility    | BoardVisibility | Public or private            |
| coverPinId    | String?         | Cover Pin ID                 |
| pinCount      | Int             | Denormalized saved Pin count |
| followerCount | Int             | Denormalized follower count  |
| createdAt     | DateTime        | Creation timestamp           |
| updatedAt     | DateTime        | Update timestamp             |

### Board Visibility

`BoardVisibility` values:

* `PUBLIC`
* `PRIVATE`

### Notes

* Private boards may be deferred from MVP.
* Public board pages should show only published Pins.
* `pinCount` must update when Pins are added or removed.

---

## 8.2 BoardPin

The `BoardPin` model connects Pins to Boards.

### Responsibilities

It represents a Save action into a specific Board.

### Main Fields

| Field         | Type     | Description            |
| ------------- | -------- | ---------------------- |
| id            | String   | Unique BoardPin ID     |
| boardId       | String   | Board ID               |
| pinId         | String   | Pin ID                 |
| savedByUserId | String   | User who saved the Pin |
| note          | String?  | Optional user note     |
| createdAt     | DateTime | Save timestamp         |

### Constraints

Unique constraint:

* `boardId + pinId`

### Rules

* A Pin cannot be saved twice into the same Board.
* A Pin can be saved into multiple different Boards.
* Only published Pins can be saved.
* Saving a Pin should increase `Pin.saveCount`.
* Removing a Pin from Board should decrease `Pin.saveCount`.

---

# 9. Likes & Follows Domain

## 9.1 Like

The `Like` model stores user likes on Pins.

### Responsibilities

It supports:

* Like/unlike.
* Recommendation signals.
* Engagement metrics.

### Main Fields

| Field     | Type     | Description    |
| --------- | -------- | -------------- |
| id        | String   | Unique like ID |
| userId    | String   | User ID        |
| pinId     | String   | Pin ID         |
| createdAt | DateTime | Like timestamp |

### Constraints

Unique constraint:

* `userId + pinId`

### Rules

* A user can like a Pin only once.
* Unliking deletes the Like record.
* Like/unlike must update `Pin.likeCount`.

---

## 9.2 UserFollow

The `UserFollow` model stores user-to-user follow relationships.

### Main Fields

| Field          | Type     | Description         |
| -------------- | -------- | ------------------- |
| id             | String   | Unique follow ID    |
| followerUserId | String   | User who follows    |
| targetUserId   | String   | User being followed |
| createdAt      | DateTime | Follow timestamp    |

### Constraints

Unique constraint:

* `followerUserId + targetUserId`

### Rules

* A user should not follow themselves.
* Following a user can influence the Home Feed.
* A follow event may create a notification.

---

## 9.3 BoardFollow

The `BoardFollow` model stores user-to-board follow relationships.

### Main Fields

| Field     | Type     | Description       |
| --------- | -------- | ----------------- |
| id        | String   | Unique follow ID  |
| userId    | String   | Follower user ID  |
| boardId   | String   | Followed board ID |
| createdAt | DateTime | Follow timestamp  |

### Rules

* A user can follow a public Board.
* Following a Board should increase `Board.followerCount`.
* Unfollowing should decrease `Board.followerCount`.

---

## 9.4 CategoryFollow

The `CategoryFollow` model stores user-to-category follow relationships.

### Main Fields

| Field      | Type     | Description          |
| ---------- | -------- | -------------------- |
| id         | String   | Unique follow ID     |
| userId     | String   | Follower user ID     |
| categoryId | String   | Followed category ID |
| createdAt  | DateTime | Follow timestamp     |

### Rules

* Following a category should increase the user's interest score in that category.
* Disabled categories should not be followable.

---

# 10. Interests & Events Domain

## 10.1 UserInterest

The `UserInterest` model stores the user's interest score for each category.

### Responsibilities

It supports:

* Onboarding interests.
* Personalized feed.
* Recommendation scoring.
* Behavior-based interest updates.

### Main Fields

| Field      | Type               | Description             |
| ---------- | ------------------ | ----------------------- |
| id         | String             | Unique interest ID      |
| userId     | String             | User ID                 |
| categoryId | String             | Category ID             |
| score      | Float              | Interest score          |
| source     | UserInterestSource | Main source of interest |
| createdAt  | DateTime           | Creation timestamp      |
| updatedAt  | DateTime           | Update timestamp        |

### Sources

`UserInterestSource` values:

* `ONBOARDING`
* `VIEW`
* `LIKE`
* `SAVE`
* `FOLLOW`
* `SEARCH`
* `ADMIN_SEED`
* `SYSTEM`

### Constraints

Unique constraint:

* `userId + categoryId`

### Initial Score Rules

Suggested MVP scores:

| Action                |    Score Change |
| --------------------- | --------------: |
| Onboarding selection  |             +10 |
| View Pin              |              +1 |
| Open Pin              |              +2 |
| Like Pin              |              +3 |
| Save Pin              |              +5 |
| Follow category       |              +6 |
| Search category/query |              +2 |
| Report Pin            | Negative signal |
| Hide / Not Interested | Negative signal |

---

## 10.2 UserEvent

The `UserEvent` model stores behavioral events.

### Responsibilities

It supports:

* Feed personalization.
* Analytics.
* Recommendation improvement.
* Abuse detection.
* Ad event context.

### Main Fields

| Field        | Type          | Description                  |
| ------------ | ------------- | ---------------------------- |
| id           | String        | Unique event ID              |
| userId       | String?       | User ID, nullable for guests |
| sessionId    | String?       | Session ID                   |
| eventType    | UserEventType | Event type                   |
| targetType   | String?       | Target entity type           |
| targetId     | String?       | Target entity ID             |
| metadataJson | Json?         | Extra event data             |
| createdAt    | DateTime      | Event timestamp              |

### Event Types

`UserEventType` values:

* `VIEW_PIN`
* `OPEN_PIN`
* `LIKE_PIN`
* `UNLIKE_PIN`
* `SAVE_PIN`
* `UNSAVE_PIN`
* `CREATE_BOARD`
* `FOLLOW_USER`
* `UNFOLLOW_USER`
* `FOLLOW_BOARD`
* `UNFOLLOW_BOARD`
* `FOLLOW_CATEGORY`
* `UNFOLLOW_CATEGORY`
* `SEARCH`
* `SHARE_PIN`
* `REPORT_PIN`
* `HIDE_PIN`
* `NOT_INTERESTED`
* `CLICK_AD`

### Notes

* This table can grow quickly.
* It may require partitioning or archival later.
* MVP can keep it simple with indexes on `userId`, `eventType`, and `createdAt`.

---

# 11. Reports Domain

## 11.1 Report

The `Report` model stores user-generated reports against Pins, Users, or Boards.

### Responsibilities

It supports:

* Content safety.
* Abuse detection.
* User moderation.
* Admin report handling.

### Main Fields

| Field          | Type             | Description          |
| -------------- | ---------------- | -------------------- |
| id             | String           | Unique report ID     |
| reporterUserId | String           | Reporter user ID     |
| targetType     | ReportTargetType | Target type          |
| targetId       | String           | Target ID            |
| reason         | ReportReason     | Report reason        |
| description    | String?          | Optional explanation |
| status         | ReportStatus     | Report status        |
| reviewedById   | String?          | Admin reviewer       |
| reviewNote     | String?          | Admin note           |
| createdAt      | DateTime         | Creation timestamp   |
| updatedAt      | DateTime         | Update timestamp     |

### Target Types

`ReportTargetType` values:

* `PIN`
* `USER`
* `BOARD`

### Report Reasons

`ReportReason` values:

* `ADULT_CONTENT`
* `NUDITY`
* `SEXUAL_CONTENT`
* `RACY_CONTENT`
* `VIOLENCE`
* `MEDICAL_SENSITIVE`
* `SPAM`
* `HARASSMENT`
* `ILLEGAL_CONTENT`
* `COPYRIGHT`
* `OTHER`

### Report Statuses

`ReportStatus` values:

* `OPEN`
* `IN_REVIEW`
* `RESOLVED`
* `REJECTED`

### Design Note

Reports use a polymorphic target:

* `targetType`
* `targetId`

This is intentional because reports may target different entity types.

### Rules

* A user should not be allowed to spam unlimited duplicate reports.
* Reports should appear in the admin panel.
* Admin decisions must be logged in `AuditLog`.
* If a Pin receives too many reports, it may be temporarily hidden or sent to review.

---

# 12. Notifications Domain

## 12.1 Notification

The `Notification` model stores in-app notifications.

### Responsibilities

It supports:

* Follow notifications.
* Like notifications.
* Save notifications.
* Moderation result notifications.
* Report resolution notifications.
* Admin warnings.

### Main Fields

| Field      | Type             | Description                      |
| ---------- | ---------------- | -------------------------------- |
| id         | String           | Unique notification ID           |
| userId     | String           | Recipient user ID                |
| type       | NotificationType | Notification type                |
| actorId    | String?          | User who caused the notification |
| targetType | String?          | Target entity type               |
| targetId   | String?          | Target entity ID                 |
| message    | String           | Notification text                |
| isRead     | Boolean          | Read status                      |
| createdAt  | DateTime         | Creation timestamp               |

### Notification Types

`NotificationType` values:

* `USER_FOLLOWED_YOU`
* `PIN_LIKED`
* `PIN_SAVED`
* `PIN_APPROVED`
* `PIN_REJECTED`
* `REPORT_RESOLVED`
* `ADMIN_WARNING`
* `SYSTEM`

### Notes

* MVP supports in-app notifications only.
* Push notifications and email notifications are out of scope.

---

# 13. Ads Domain

## 13.1 AdSlot

The `AdSlot` model stores ad placement configuration.

### Responsibilities

It supports:

* Native ad placement.
* Provider configuration.
* Frequency control.
* Active/inactive ad slots.

### Main Fields

| Field              | Type        | Description                    |
| ------------------ | ----------- | ------------------------------ |
| id                 | String      | Unique ad slot ID              |
| placement          | AdPlacement | Placement type                 |
| provider           | AdProvider  | Ad provider                    |
| name               | String      | Slot name                      |
| isActive           | Boolean     | Whether slot is active         |
| frequencyEvery     | Int         | Insert ad after N organic Pins |
| providerConfigJson | Json?       | Provider configuration         |
| createdAt          | DateTime    | Creation timestamp             |
| updatedAt          | DateTime    | Update timestamp               |

### Providers

`AdProvider` values:

* `YEKTANET`
* `INTERNAL`
* `DIRECT`
* `AFFILIATE`

### Placements

`AdPlacement` values:

* `HOME_FEED_INLINE`
* `PIN_DETAIL_RELATED`
* `SEARCH_INLINE`
* `CATEGORY_FEED_INLINE`

### MVP Rule

For the Home Feed:

* Use `HOME_FEED_INLINE`.
* Use provider `YEKTANET`.
* Insert one ad after every 6 or 7 organic Pins.
* Do not show ads as the first feed item.
* Do not show ads back-to-back.
* If ad loading fails, continue rendering the feed.

---

## 13.2 AdEvent

The `AdEvent` model stores internal ad-related events.

### Responsibilities

It supports:

* Ad render tracking.
* Ad click tracking.
* Ad failure monitoring.
* Internal analytics.

### Main Fields

| Field        | Type        | Description           |
| ------------ | ----------- | --------------------- |
| id           | String      | Unique ad event ID    |
| userId       | String?     | User ID               |
| slotId       | String?     | AdSlot ID             |
| sessionId    | String?     | Session ID            |
| provider     | AdProvider  | Ad provider           |
| placement    | AdPlacement | Placement             |
| eventType    | AdEventType | Event type            |
| adReference  | String?     | Provider ad reference |
| metadataJson | Json?       | Extra event data      |
| createdAt    | DateTime    | Event timestamp       |

### Ad Event Types

`AdEventType` values:

* `AD_SLOT_REQUESTED`
* `AD_SLOT_RENDERED`
* `AD_IMPRESSION_ATTEMPTED`
* `AD_CLICKED`
* `AD_FAILED`

### Notes

* Yektanet may provide its own reporting.
* Internal ad events are still useful for product analytics and UX monitoring.

---

# 14. Audit Log Domain

## 14.1 AuditLog

The `AuditLog` model records important admin and system actions.

### Responsibilities

It supports:

* Admin accountability.
* Moderation traceability.
* Security review.
* Debugging critical changes.
* Compliance-style record keeping.

### Main Fields

| Field        | Type        | Description             |
| ------------ | ----------- | ----------------------- |
| id           | String      | Unique audit log ID     |
| actorId      | String?     | Admin/user/system actor |
| action       | AuditAction | Action type             |
| targetType   | String?     | Target entity type      |
| targetId     | String?     | Target entity ID        |
| oldValueJson | Json?       | Old value snapshot      |
| newValueJson | Json?       | New value snapshot      |
| note         | String?     | Optional note           |
| ipAddress    | String?     | Actor IP address        |
| createdAt    | DateTime    | Action timestamp        |

### Audit Actions

`AuditAction` values:

* `PIN_APPROVED`
* `PIN_REJECTED`
* `PIN_REMOVED`
* `PIN_RESTORED`
* `USER_SUSPENDED`
* `USER_BANNED`
* `USER_RESTORED`
* `REPORT_RESOLVED`
* `CATEGORY_CREATED`
* `CATEGORY_UPDATED`
* `CATEGORY_DISABLED`
* `MODERATION_SETTING_UPDATED`
* `AD_SETTING_UPDATED`
* `ADMIN_LOGIN`
* `SYSTEM_CHANGE`

### Rules

* Admin moderation actions must create audit logs.
* User suspension and ban actions must create audit logs.
* System setting changes must create audit logs.
* Audit logs should not be physically deleted in normal operation.

---

# 15. System Settings Domain

## 15.1 SystemSetting

The `SystemSetting` model stores configurable product settings.

### Responsibilities

It supports:

* SafeSearch thresholds.
* Upload limits.
* Ad frequency settings.
* Moderation rules.
* Feature flags.
* Runtime configuration.

### Main Fields

| Field       | Type     | Description                |
| ----------- | -------- | -------------------------- |
| id          | String   | Unique setting ID          |
| key         | String   | Unique setting key         |
| valueJson   | Json     | Setting value              |
| description | String?  | Human-readable description |
| createdAt   | DateTime | Creation timestamp         |
| updatedAt   | DateTime | Update timestamp           |

### Suggested Initial Settings

#### safe_search_thresholds

```json
{
  "adult": {
    "reject": ["LIKELY", "VERY_LIKELY"],
    "review": ["POSSIBLE", "UNKNOWN"]
  },
  "racy": {
    "reject": ["LIKELY", "VERY_LIKELY"],
    "review": ["POSSIBLE", "UNKNOWN"]
  },
  "violence": {
    "reject": ["LIKELY", "VERY_LIKELY"],
    "review": ["POSSIBLE", "UNKNOWN"]
  },
  "medical": {
    "reject": [],
    "review": ["POSSIBLE", "LIKELY", "VERY_LIKELY", "UNKNOWN"]
  }
}
```

#### upload_limits

```json
{
  "maxImageSizeMb": 10,
  "allowedMimeTypes": [
    "image/jpeg",
    "image/png",
    "image/webp"
  ],
  "maxUploadsPerDayForNewUser": 10
}
```

#### feed_ad_frequency

```json
{
  "homeFeedInlineAdEvery": 6,
  "disableFirstPositionAd": true,
  "preventBackToBackAds": true
}
```

---

# 16. Important Relationships

## 16.1 User Relationships

A User can have:

* Many Pins.
* Many Boards.
* Many Likes.
* Many saved BoardPins.
* Many UserInterests.
* Many UserEvents.
* Many Reports.
* Many Notifications.
* Many AdEvents.
* Many AuditLogs if admin.

## 16.2 Pin Relationships

A Pin belongs to:

* One owner User.
* Zero or one Category.

A Pin can have:

* One ImageAsset.
* Many ModerationResults.
* Many Likes.
* Many BoardPins.
* Many Boards through BoardPin.
* Many Reports through polymorphic Report target.

## 16.3 Board Relationships

A Board belongs to:

* One owner User.

A Board can have:

* Many BoardPins.
* Many followers.
* One optional cover Pin.

## 16.4 Category Relationships

A Category can have:

* Many Pins.
* Many UserInterests.
* Many CategoryFollows.
* Parent and child categories.

## 16.5 Moderation Relationships

A ModerationResult belongs to:

* One Pin.
* Optionally one reviewer User.

## 16.6 Ad Relationships

An AdSlot can have:

* Many AdEvents.

An AdEvent can belong to:

* Optional User.
* Optional AdSlot.

---

# 17. Indexing Strategy

## 17.1 User Indexes

Important indexes:

* `username`
* `email`
* `phone`
* `status`
* `role`
* `createdAt`

Purpose:

* Login.
* Profile lookup.
* Admin filtering.
* User management.

## 17.2 Pin Indexes

Important indexes:

* `ownerUserId`
* `categoryId`
* `status`
* `createdAt`
* `likeCount`
* `saveCount`
* `reportCount`

Purpose:

* Feed query.
* Profile Pins.
* Category feed.
* Trending feed.
* Moderation filtering.

## 17.3 Board Indexes

Important indexes:

* `ownerUserId`
* `visibility`
* `createdAt`

Purpose:

* Profile boards.
* Public board listing.
* Board management.

## 17.4 Event Indexes

Important indexes:

* `userId`
* `sessionId`
* `eventType`
* `targetType + targetId`
* `createdAt`

Purpose:

* Feed personalization.
* Analytics.
* User behavior tracking.

## 17.5 Report Indexes

Important indexes:

* `reporterUserId`
* `targetType + targetId`
* `status`
* `createdAt`

Purpose:

* Report dashboard.
* Duplicate report control.
* Moderation workflow.

## 17.6 Ad Indexes

Important indexes:

* `provider`
* `placement`
* `eventType`
* `createdAt`

Purpose:

* Ad analytics.
* Ad provider debugging.
* UX monitoring.

---

# 18. Transaction Rules

## 18.1 Like Transaction

When a user likes a Pin:

1. Create `Like`.
2. Increment `Pin.likeCount`.
3. Create `UserEvent` with `LIKE_PIN`.
4. Optionally create notification for Pin owner.

All steps should be inside a database transaction.

When a user unlikes a Pin:

1. Delete `Like`.
2. Decrement `Pin.likeCount`.
3. Create `UserEvent` with `UNLIKE_PIN`.

## 18.2 Save Transaction

When a user saves a Pin to a Board:

1. Check Pin is `PUBLISHED`.
2. Check Board belongs to user or user has permission.
3. Create `BoardPin`.
4. Increment `Pin.saveCount`.
5. Increment `Board.pinCount`.
6. Create `UserEvent` with `SAVE_PIN`.
7. Update `UserInterest`.

All steps should be inside a database transaction.

## 18.3 Report Transaction

When a user reports a Pin:

1. Create `Report`.
2. Increment `Pin.reportCount` if target is Pin.
3. Create `UserEvent` with `REPORT_PIN`.
4. If report threshold is reached, mark Pin for review or hide from feed.
5. Notify admin queue if needed.

## 18.4 Moderation Approval Transaction

When admin approves a Pin:

1. Update `Pin.status` to `PUBLISHED`.
2. Update or create `ModerationResult` decision.
3. Create `AuditLog`.
4. Create notification for uploader.

## 18.5 Moderation Rejection Transaction

When admin rejects a Pin:

1. Update `Pin.status` to `REJECTED`.
2. Update or create `ModerationResult` decision.
3. Create `AuditLog`.
4. Create notification for uploader.

## 18.6 Follow Transaction

When a user follows a Board:

1. Create `BoardFollow`.
2. Increment `Board.followerCount`.
3. Create `UserEvent`.
4. Update `UserInterest` if relevant.

When unfollowing:

1. Delete `BoardFollow`.
2. Decrement `Board.followerCount`.
3. Create `UserEvent`.

---

# 19. Seed Data

## 19.1 Initial Categories

Initial MVP categories:

1. Home Decor
2. Fashion
3. Beauty
4. Food
5. Travel
6. Photography
7. Art
8. Wedding
9. Kitchen
10. Gift Ideas
11. Graphic Design
12. Fitness
13. Architecture
14. Handmade
15. Lifestyle
16. Cars
17. Technology
18. Education
19. Nature
20. Minimal Design

Suggested slugs:

* `home-decor`
* `fashion`
* `beauty`
* `food`
* `travel`
* `photography`
* `art`
* `wedding`
* `kitchen`
* `gift-ideas`
* `graphic-design`
* `fitness`
* `architecture`
* `handmade`
* `lifestyle`
* `cars`
* `technology`
* `education`
* `nature`
* `minimal-design`

## 19.2 Initial Admin User

Create one `SUPER_ADMIN` user during seed.

Required fields:

* username
* displayName
* email
* passwordHash
* role = `SUPER_ADMIN`
* status = `ACTIVE`

Password must be read from environment variable, not hardcoded.

Example environment variable:

```env
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=change-this-password
```

## 19.3 Initial Ad Slot

Create one active AdSlot:

| Field          | Value                   |
| -------------- | ----------------------- |
| placement      | HOME_FEED_INLINE        |
| provider       | YEKTANET                |
| name           | Home Feed Native Inline |
| isActive       | true                    |
| frequencyEvery | 6                       |

## 19.4 Initial System Settings

Seed these settings:

1. `safe_search_thresholds`
2. `upload_limits`
3. `feed_ad_frequency`
4. `feature_flags`

Suggested feature flags:

```json
{
  "enablePrivateBoards": false,
  "enableComments": false,
  "enableNativeAds": true,
  "enableSafeSearch": true,
  "enableManualModeration": true
}
```

---

# 20. Feed Query Strategy

## 20.1 MVP Simple Feed

Initial Home Feed query:

* Select Pins where `status = PUBLISHED`.
* Exclude removed/rejected/pending Pins.
* Sort by:

  1. `createdAt DESC`
  2. `saveCount DESC`
  3. `likeCount DESC`

Use cursor-based pagination.

## 20.2 Personalized Feed

After basic feed works, ranking should consider:

* UserInterest score.
* Category match.
* Followed users.
* Followed boards.
* Pin popularity.
* Freshness.
* Report penalty.
* Diversity penalty.
* Seen penalty.

## 20.3 Ad Insertion

Ad insertion should happen after organic ranking.

Process:

1. Generate organic Pin list.
2. Read active `AdSlot`.
3. Insert one Ad item after every `frequencyEvery` organic Pins.
4. Do not place Ad at first position.
5. Do not place Ads back-to-back.
6. If provider fails, omit Ad item.

---

# 21. Data Integrity Rules

## 21.1 Public Content Rule

Only `Pin.status = PUBLISHED` can be public.

## 21.2 No Duplicate Likes

A user cannot like the same Pin more than once.

Enforced by:

* `Like` unique constraint: `userId + pinId`

## 21.3 No Duplicate Board Save

A Board cannot contain the same Pin twice.

Enforced by:

* `BoardPin` unique constraint: `boardId + pinId`

## 21.4 No Duplicate Follows

A user cannot follow the same target twice.

Enforced by:

* `UserFollow` unique constraint
* `BoardFollow` unique constraint
* `CategoryFollow` unique constraint

## 21.5 Deleted or Removed Content

Removed content should usually be soft-deleted by status change.

Physical deletion should be limited because:

* Reports may reference content.
* Audit logs may reference content.
* Moderation history should remain available.

## 21.6 Denormalized Counts

The following fields are denormalized:

* `Pin.likeCount`
* `Pin.saveCount`
* `Pin.shareCount`
* `Pin.reportCount`
* `Pin.viewCount`
* `Board.pinCount`
* `Board.followerCount`

They must be updated carefully inside transactions.

---

# 22. Future Schema Extensions

The following models may be added later:

## 22.1 Comment

For commenting on Pins.

Potential fields:

* id
* userId
* pinId
* body
* status
* createdAt
* updatedAt

## 22.2 SavedSearch

For user saved searches.

Potential fields:

* id
* userId
* query
* filtersJson
* createdAt

## 22.3 FeedCache

For precomputed personalized feeds.

Potential fields:

* id
* userId
* pinId
* score
* reason
* generatedAt

## 22.4 SponsoredPin

For internal advertising beyond Yektanet.

Potential fields:

* id
* advertiserId
* pinId
* campaignId
* budget
* status
* createdAt

## 22.5 BusinessProfile

For brands, stores, or advertisers.

Potential fields:

* id
* ownerUserId
* brandName
* website
* status
* createdAt

## 22.6 CopyrightClaim

For copyright moderation.

Potential fields:

* id
* claimantUserId
* pinId
* description
* evidenceUrl
* status
* reviewedById
* createdAt

---

# 23. Implementation Notes for Codex

Codex should not implement the full platform in one task.

Recommended implementation order:

1. Project foundation.
2. Prisma setup and migration.
3. Seed data.
4. Authentication.
5. User profile.
6. Onboarding interests.
7. Pin upload base.
8. Image processing.
9. SafeSearch moderation.
10. Admin moderation panel.
11. Boards and save system.
12. Likes, shares, and reports.
13. Simple Home Feed.
14. Personalized Feed.
15. Native ads.
16. Search.
17. Admin reports.
18. Notifications.
19. Polish and beta launch.

Important instruction for Codex:

```text
Read SDD.md, DATABASE_SCHEMA.md, and prisma/schema.prisma.
Implement only the requested epic.
Do not implement unrelated modules.
After each epic, explain changed files, commands to run, and test steps.
```

---

# 24. Current MVP Database Completion Checklist

The database schema is considered MVP-ready if it supports:

* Users
* Sessions
* Categories
* Pins
* Image assets
* Moderation results
* Boards
* Saved Pins
* Likes
* User follows
* Board follows
* Category follows
* User interests
* User events
* Reports
* Notifications
* Ad slots
* Ad events
* Audit logs
* System settings

This schema is sufficient to begin MVP implementation with AI-assisted development.
