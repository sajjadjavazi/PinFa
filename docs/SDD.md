# Software Design Document

# Persian Visual Discovery Platform — MVP v1.0

## 1. Document Information

### 1.1 Document Title

Software Design Document for a Persian Visual Discovery and Mood-Board Platform.

### 1.2 Project Codename

Working name: **Pinfa**

The final product name may change later.

### 1.3 Document Version

Version: **1.0 MVP Draft**

### 1.4 Product Type

A web-based visual discovery platform inspired by the general product logic of Pinterest, designed for Persian-speaking users, image-based inspiration, personal boards, social discovery, content moderation, and native advertising monetization.

### 1.5 Important Legal and Product Note

This product should be designed as an independent visual discovery platform. It must not copy Pinterest’s brand identity, copyrighted UI assets, proprietary content, exact visual design, wording, logo, or protected intellectual property. The product may follow common social media and visual discovery patterns such as feeds, image cards, profiles, boards, saves, likes, follows, and recommendations.

---

## 2. Product Overview

### 2.1 Core Idea

The platform allows users to discover, upload, save, organize, and share images. Users can create personal boards, save images into boards, follow users, follow boards, like images, report inappropriate content, and receive a personalized home feed based on their interests and behavior.

The platform is web-first in the MVP phase. It supports only image content at launch. Video, messaging, paid creator tools, marketplace features, and native mobile apps are excluded from the MVP.

The product includes a content moderation pipeline because moral, cultural, and legal content restrictions are critical in the target market. Uploaded images must pass an automated safety check using Google Vision SafeSearch and, if necessary, a manual admin review process.

The platform will monetize initially through native in-feed advertising, using Yektanet native ads. In the home feed, one native ad card should appear approximately after every 6 or 7 organic image posts, without making the user experience annoying or intrusive.

---

## 3. Business Objectives

### 3.1 Primary Business Objective

Build a Persian visual discovery platform that can attract real users, keep them engaged through personalized visual content, and generate early revenue through native advertising.

### 3.2 Secondary Business Objectives

1. Create a scalable foundation for future sponsored content.
2. Build a user behavior dataset for personalization.
3. Enable user-generated content while maintaining strict content safety.
4. Reduce image bandwidth and storage cost through image optimization.
5. Build a flexible feed system that can later support stronger recommendation algorithms.
6. Build a moderation-first platform suitable for the target cultural and legal environment.

### 3.3 Monetization Objective

The MVP monetization model is based on native advertising.

Initial monetization:

* Native ads inside the home feed.
* Yektanet native ad integration.
* Internal tracking of ad render, impression attempt, click, and failure.

Future monetization:

* Sponsored pins.
* Brand profiles.
* Promoted boards.
* Merchant discovery pages.
* Affiliate commerce.
* Premium creator/business accounts.
* Internal ad marketplace.

---

## 4. Target Users

### 4.1 Regular User

A regular user browses images, discovers ideas, saves images, builds boards, and follows topics or people.

Needs:

* Fast visual feed.
* Relevant image recommendations.
* Easy save-to-board experience.
* Simple search.
* Clean profile.
* Ability to follow users and boards.
* Low-friction sharing.
* Safe and culturally appropriate content.

### 4.2 Uploader / Creator

A creator uploads images to be discovered by other users.

Needs:

* Easy image upload.
* Clear content rules.
* Image title and description fields.
* Category selection.
* Upload status visibility.
* Reason for rejection if content is rejected.
* Profile page showing uploaded images and boards.

### 4.3 Admin / Moderator

An admin reviews content, reports, suspicious uploads, categories, and user abuse.

Needs:

* Moderation queue.
* SafeSearch result visibility.
* Manual approve/reject tools.
* User suspension tools.
* Report handling dashboard.
* Audit log.
* Category management.
* Basic analytics.

### 4.4 Advertiser / Native Ad Provider

In the MVP, the advertising provider is external. The system integrates with Yektanet native ads.

Needs:

* Native ad placement in feed.
* Ad rendering inside the visual grid.
* Ad label visibility.
* Click tracking.
* Impression tracking if supported.
* Graceful fallback if the ad provider fails.

---

## 5. Product Scope

## 5.1 MVP Scope

The MVP includes:

1. User registration and login.
2. User profile.
3. User avatar.
4. User bio.
5. Image upload.
6. Image validation.
7. Image compression.
8. Image resizing.
9. WebP conversion if possible.
10. Google Vision SafeSearch moderation.
11. Manual moderation queue.
12. Home feed.
13. Masonry-style image grid.
14. Pin detail page.
15. Like image.
16. Save image.
17. Create board.
18. Save image into board.
19. User boards.
20. Follow user.
21. Follow board.
22. Share image link.
23. Report image.
24. Report user.
25. Search images.
26. Search boards.
27. Search users.
28. Category browsing.
29. Basic recommendation algorithm.
30. User interest tracking.
31. User behavior events.
32. Native ad insertion in feed.
33. Admin panel.
34. Content moderation dashboard.
35. Report management.
36. Basic notification system.
37. Mobile-responsive web UI.

## 5.2 Out of Scope for MVP

The following features are not included in the MVP:

1. Native Android app.
2. Native iOS app.
3. Video upload.
4. Direct messaging.
5. Group boards.
6. Private boards, unless cheap to implement.
7. Paid user subscriptions.
8. Internal payment system.
9. Full advertiser dashboard.
10. AI image generation.
11. Advanced deep learning recommendation.
12. Full copyright detection.
13. Seller marketplace.
14. Affiliate checkout.
15. Live chat.
16. Story-like content.
17. Advanced analytics dashboard for creators.
18. Public API.
19. Multi-language support.
20. Complex role-based business accounts.

---

## 6. Product Principles

### 6.1 Visual First

The main value of the product is visual discovery. The UI must prioritize images, boards, and smooth browsing.

### 6.2 Safe by Design

Every uploaded image must pass through content safety checks before public distribution.

### 6.3 Fast by Default

Images must be optimized for fast loading. The feed must use lazy loading, pagination, image variants, and CDN/object storage.

### 6.4 Personalization from Day One

Even the MVP must collect basic user behavior and use it to improve the feed.

### 6.5 Ads Must Not Break UX

Native ads must be inserted naturally and must not overload the feed.

### 6.6 Admin Control Is Required

Automated AI moderation is not enough. The admin must be able to approve, reject, remove, restore, and audit content.

### 6.7 Provider Abstraction

External integrations such as Google Vision and Yektanet must be implemented through adapter interfaces so they can be replaced later.

---

## 7. User Roles and Permissions

### 7.1 Guest User

Allowed:

* View public landing page.
* Browse limited public pins.
* Search limited public content.
* View public pin detail pages.
* Register.
* Login.

Not allowed:

* Upload images.
* Like.
* Save.
* Create boards.
* Follow users.
* Report content, unless anonymous reporting is enabled later.

### 7.2 Registered User

Allowed:

* View full feed.
* Select interests.
* Upload images.
* Like pins.
* Save pins.
* Create boards.
* Follow users.
* Follow boards.
* Report content.
* Edit own profile.
* Delete own uploaded pin, subject to policy.
* View notifications.

### 7.3 Trusted User

A trusted user is a registered user with good behavior history.

Allowed:

* Higher upload limits.
* Faster moderation path.
* Reduced manual review frequency.

### 7.4 Moderator

Allowed:

* View moderation queue.
* Approve pins.
* Reject pins.
* Remove published pins.
* Review reports.
* Add moderation notes.
* Warn users.

Not allowed:

* Change system settings.
* Delete admin logs.
* Manage other admins.

### 7.5 Super Admin

Allowed:

* All moderator permissions.
* Manage users.
* Suspend users.
* Ban users.
* Manage categories.
* Manage moderation thresholds.
* Manage ad placement settings.
* View analytics.
* View audit logs.
* Manage admin roles.

---

## 8. Core Domain Concepts

### 8.1 Pin

A Pin is a single image post on the platform.

A Pin includes:

* Image.
* Title.
* Description.
* Owner.
* Category.
* Status.
* Moderation state.
* Like count.
* Save count.
* Share count.
* Report count.
* View count.

### 8.2 Board

A Board is a personal or public collection of saved Pins.

A Board includes:

* Title.
* Description.
* Owner.
* Cover image.
* Visibility.
* List of saved Pins.
* Follower count.

### 8.3 Save

A Save means the user stores a Pin inside one of their Boards.

Save is more important than Like for recommendation because it indicates stronger user interest.

### 8.4 Like

A Like is a lightweight positive signal.

### 8.5 Follow

A user can follow:

* Another user.
* A board.
* A category/topic.

### 8.6 Report

A Report is a user-generated moderation signal against a Pin, Board, User, or Comment if comments are added later.

### 8.7 Feed

The Feed is a personalized ranked list of organic Pins and native Ad Cards.

### 8.8 Native Ad Card

A Native Ad Card is a feed item rendered similarly to Pin cards but clearly marked as an advertisement.

---

## 9. Main User Flows

## 9.1 Registration Flow

1. User opens the website.
2. User clicks Register.
3. User enters email or phone.
4. User sets password.
5. User accepts Terms and Content Policy.
6. System creates account.
7. System verifies email or phone.
8. User selects initial interests.
9. System creates initial UserInterest records.
10. User enters Home Feed.

Acceptance criteria:

* User cannot complete registration without accepting terms.
* User must select at least a minimum number of interests.
* User must receive a feed after onboarding.

## 9.2 Login Flow

1. User opens Login page.
2. User enters credentials.
3. System validates credentials.
4. System creates session.
5. User enters Home Feed.

Acceptance criteria:

* Invalid login attempts must be rate-limited.
* Passwords must never be stored in plain text.
* Session must be securely managed.

## 9.3 Upload Pin Flow

1. User clicks Upload.
2. User selects image file.
3. System validates file format.
4. System validates file size.
5. User enters title.
6. User enters optional description.
7. User selects category.
8. User optionally selects a board.
9. User submits upload.
10. System stores image temporarily.
11. System processes image variants.
12. System sends image to SafeSearch.
13. System stores moderation result.
14. System decides whether to auto-approve, reject, or send to human review.
15. User sees upload status.

Acceptance criteria:

* Unsupported files are rejected.
* Oversized files are rejected or compressed depending on policy.
* Unapproved images must not appear in public feed.
* User must see clear upload status.

## 9.4 Save Pin to Board Flow

1. User clicks Save on a Pin.
2. System opens board selection modal.
3. User selects existing board or creates a new board.
4. System saves Pin to selected board.
5. System updates save count.
6. System records user event.
7. System updates user interest scores.

Acceptance criteria:

* User cannot save the same Pin into the same Board twice.
* User can save the same Pin into multiple different Boards.
* If the user has no Board, system should suggest creating one.

## 9.5 Home Feed Flow

1. User opens Home page.
2. System loads user profile and interest data.
3. System retrieves candidate Pins.
4. System ranks Pins.
5. System inserts native ads after every 6 or 7 organic Pins.
6. System returns mixed feed items.
7. User scrolls.
8. System loads next batch using cursor pagination.
9. User behavior events are recorded.

Acceptance criteria:

* Feed must not show rejected or removed Pins.
* Feed must not show excessive duplicates.
* Feed must include ads at configured frequency.
* Feed must remain functional if ad provider fails.

## 9.6 Report Content Flow

1. User clicks Report.
2. User selects report reason.
3. User optionally adds description.
4. System creates report.
5. System increases report count.
6. If threshold is reached, system temporarily hides content or sends it to review.
7. Admin reviews report.
8. Admin resolves report.

Acceptance criteria:

* User can report each target only once per reason or once per target, depending on policy.
* Reports must appear in admin panel.
* Admin action must be logged.

---

## 10. Content Moderation Specification

## 10.1 Moderation Goals

The moderation system must prevent public distribution of inappropriate images, including:

1. Adult content.
2. Nudity.
3. Pornographic content.
4. Sexual activity.
5. Racy or sexually suggestive content.
6. Graphic violence.
7. Blood or injury.
8. Sensitive medical or body content.
9. Disturbing body-related imagery.
10. Illegal or culturally unsafe content.
11. Spam.
12. Harmful or abusive content.

## 10.2 Google Vision SafeSearch Fields

The system must store the following SafeSearch likelihood values:

* adult
* racy
* violence
* medical
* spoof

Possible values:

* UNKNOWN
* VERY_UNLIKELY
* UNLIKELY
* POSSIBLE
* LIKELY
* VERY_LIKELY

## 10.3 Default Automated Decision Rules

The MVP default rules:

1. If adult is LIKELY or VERY_LIKELY, reject.
2. If racy is LIKELY or VERY_LIKELY, reject.
3. If violence is LIKELY or VERY_LIKELY, reject.
4. If medical is LIKELY or VERY_LIKELY, send to human review.
5. If adult, racy, or violence is POSSIBLE, send to human review.
6. If medical is POSSIBLE, send to human review.
7. If all critical fields are VERY_UNLIKELY or UNLIKELY, auto-approve.
8. If result is UNKNOWN, send to human review.
9. Admin can override automated decision.

## 10.4 Moderation States

A Pin may have one of these moderation states:

* uploaded
* processing
* pending_ai_review
* auto_approved
* pending_human_review
* approved
* rejected
* removed
* appealed

## 10.5 Publication Rule

Only Pins with status `approved` or `auto_approved` can appear in public areas.

Public areas include:

* Home Feed.
* Category Feed.
* Search Results.
* Profile Page.
* Board Page.
* Similar Pins.

## 10.6 Human Review Queue

A Pin enters human review if:

* SafeSearch result is ambiguous.
* SafeSearch result is risky.
* User has low trust score.
* Pin receives multiple reports.
* Category is sensitive.
* Admin manually sends it to review.

Human review screen must show:

* Image preview.
* Image variants.
* Uploader.
* Upload date.
* Category.
* SafeSearch result.
* Report count.
* User history.
* Approve button.
* Reject button.
* Remove button.
* Suspend user button.
* Review note field.

## 10.7 Report-Based Moderation

If a Pin receives reports above a configured threshold:

* It should be removed from recommendation surfaces temporarily.
* It should enter moderation queue.
* Admin should review it.
* If approved again, it may return to public feed.

## 10.8 Audit Log

Every moderation decision must create an audit log entry.

Audit log fields:

* actor_id
* actor_role
* action
* target_type
* target_id
* previous_status
* new_status
* reason
* note
* created_at

---

## 11. Image Upload and Optimization Specification

## 11.1 Supported File Types

MVP supports:

* JPG
* JPEG
* PNG
* WEBP

Optional future support:

* AVIF
* HEIC conversion

## 11.2 File Size Rules

Default maximum raw upload size:

* 10 MB per image.

Recommended future adjustment:

* Lower limit for new users.
* Higher limit for trusted users.

## 11.3 Image Validation

The backend must validate:

1. File extension.
2. MIME type.
3. Actual file signature.
4. File size.
5. Image dimensions.
6. Corrupted image detection.
7. Basic malware-safe handling if supported.

## 11.4 Image Processing Pipeline

After upload:

1. Save original image to temporary storage.
2. Validate file.
3. Strip metadata.
4. Normalize orientation.
5. Resize large images.
6. Generate variants:

   * thumbnail
   * feed
   * detail
   * original_protected
7. Convert supported variants to WebP if possible.
8. Store image dimensions.
9. Extract dominant color if possible.
10. Send image to SafeSearch.
11. Apply moderation rules.
12. Move approved variants to public storage.
13. Keep rejected content private or delete according to policy.

## 11.5 Image Variants

### thumbnail

Used for:

* Small previews.
* Admin lists.
* Search suggestions.

### feed

Used for:

* Home feed cards.
* Category feed.
* Profile grid.
* Board grid.

### detail

Used for:

* Pin detail page.

### original_protected

Used for:

* Internal processing.
* Admin review.
* Future quality upgrade.

This version must not be publicly exposed unless required.

## 11.6 Performance Rules

1. The feed must never load the original image.
2. Images must use lazy loading.
3. Image width and height must be known before rendering.
4. Layout shift must be minimized.
5. Infinite scroll must use cursor pagination.
6. CDN or object storage must be used for serving images.
7. Image optimization must happen asynchronously when needed.
8. The upload process must not block the entire user session.

---

## 12. Home Feed Specification

## 12.1 Feed Objective

The Home Feed is the core product experience.

It must:

1. Show relevant images.
2. Learn from user behavior.
3. Mix popular, fresh, followed, and interest-based content.
4. Avoid inappropriate content.
5. Avoid repetitive content.
6. Insert ads naturally.
7. Load quickly.
8. Work well on mobile web.

## 12.2 Feed Sources

Candidate Pins come from:

1. User-selected interests.
2. Followed users.
3. Followed boards.
4. Followed categories.
5. Recently saved Pins.
6. Recently liked Pins.
7. Trending Pins.
8. New approved Pins.
9. Admin-curated Pins.
10. Similar Pins.
11. Cold-start popular Pins.

## 12.3 New User Feed

For a new user, feed ranking uses:

1. Onboarding interests.
2. Popular Pins in selected categories.
3. Fresh Pins in selected categories.
4. Admin-curated Pins.
5. Global trending Pins.
6. Low-frequency ads.

## 12.4 Returning User Feed

For a returning user, feed ranking uses:

1. Interest scores.
2. Saves.
3. Likes.
4. Pin detail views.
5. Follows.
6. Search history.
7. Recently viewed categories.
8. Negative signals such as reports or hide actions.

## 12.5 User Event Signals

The system records these events:

* view_pin
* open_pin
* like_pin
* unlike_pin
* save_pin
* unsave_pin
* create_board
* follow_user
* unfollow_user
* follow_board
* search
* share_pin
* report_pin
* click_ad
* hide_pin
* not_interested

## 12.6 Signal Weights for MVP

Suggested initial weights:

* view_pin: +1
* open_pin: +2
* like_pin: +3
* save_pin: +5
* share_pin: +4
* follow_user: +6
* follow_board: +6
* follow_category: +6
* report_pin: -10
* hide_pin: -8
* not_interested: -6

Save should be considered stronger than Like.

## 12.7 MVP Ranking Formula

The MVP can use a heuristic score:

FeedScore =
InterestScore

* EngagementScore
* FreshnessScore
* FollowScore
* QualityScore
* DiversityScore

- ReportPenalty
- RepetitionPenalty
- SeenPenalty

Where:

* InterestScore measures user-category match.
* EngagementScore measures global likes, saves, opens, and shares.
* FreshnessScore boosts newer approved content.
* FollowScore boosts followed users and boards.
* QualityScore boosts low-report, high-save content.
* DiversityScore prevents narrow repetitive content.
* ReportPenalty reduces risky content.
* RepetitionPenalty reduces similar repeated content.
* SeenPenalty reduces already-seen Pins.

## 12.8 Feed Pagination

The feed must use cursor-based pagination.

Request:

* cursor
* limit
* optional category
* optional feed type

Default limit:

* 20 to 30 feed items.

Response includes:

* items
* next_cursor
* has_more

## 12.9 Feed Item Types

Feed items can be:

* pin
* ad
* recommendation_section
* onboarding_suggestion

MVP requires:

* pin
* ad

## 12.10 Ad Insertion in Feed

Ad insertion rules:

1. The first item in the feed must not be an ad.
2. Insert one native ad after every 6 or 7 organic Pins.
3. Ads must not appear back-to-back.
4. Ads must be clearly labeled as advertisement.
5. If the ad provider fails, the feed should continue without the ad.
6. The ad insertion frequency must be configurable.
7. Ad insertion must happen after organic ranking, inside the feed composition layer.

---

## 13. Native Advertising Specification

## 13.1 Initial Ad Provider

Initial provider:

* Yektanet Native Ads

## 13.2 Ad Provider Abstraction

The platform must define an AdProvider interface.

Required methods:

* getFeedAdSlot()
* renderAd()
* trackImpression()
* trackClick()
* handleFailure()

Initial implementation:

* YektanetAdProvider

Future implementations:

* InternalSponsoredPinProvider
* DirectBrandAdProvider
* AffiliateAdProvider

## 13.3 Ad Placements

MVP placement:

* Home Feed Inline Native Ad

Future placements:

* Pin Detail Related Section.
* Search Results Inline Ad.
* Category Feed Inline Ad.
* Board Page Sponsored Slot.

## 13.4 Ad Card Requirements

An Ad Card must include:

* Visual creative.
* Title or text.
* Optional CTA.
* Destination link.
* Provider tracking.
* Internal tracking.
* Advertisement label.

## 13.5 Ad UX Rules

1. Ad must visually fit the feed.
2. Ad must not deceive the user.
3. Ad must include a visible label.
4. Ad must not auto-play media.
5. Ad must not block scrolling.
6. Ad must not create layout jump.
7. Ad failure must not break feed rendering.

## 13.6 Internal Ad Events

The platform should log:

* ad_slot_requested
* ad_slot_rendered
* ad_impression_attempted
* ad_clicked
* ad_failed

Fields:

* user_id
* session_id
* placement
* provider
* timestamp
* metadata

---

## 14. User Profile Specification

## 14.1 Profile Page

A user profile shows:

* Avatar.
* Display name.
* Username.
* Bio.
* Website link.
* Follower count.
* Following count.
* Uploaded Pins tab.
* Boards tab.
* Saved tab, if public.
* Follow button.
* Share profile button.

## 14.2 Profile Editing

User can edit:

* Display name.
* Avatar.
* Bio.
* Website link.
* Username, subject to availability and rate limit.

## 14.3 Avatar Rules

Avatar must pass image validation and basic moderation.

If avatar is rejected, it must not be published.

---

## 15. Board Specification

## 15.1 Create Board

User can create a Board with:

* Title.
* Description.
* Visibility.
* Optional cover image.

## 15.2 Board Visibility

MVP visibility options:

* public

Optional:

* private

If private boards are expensive to implement, defer them.

## 15.3 Save to Board

User can save Pins to Boards.

Rules:

* Same Pin cannot be duplicated in the same Board.
* Board owner can remove Pins from Board.
* Saving a Pin increases its save count.
* Saving a Pin updates user interest scores.

## 15.4 Follow Board

User can follow a public Board.

Effects:

* Board content receives higher feed score.
* Board owner may receive notification.

---

## 16. Search Specification

## 16.1 Search Scope

MVP search supports:

* Pins.
* Boards.
* Users.
* Categories.

## 16.2 Search Fields

Pins searchable by:

* title
* description
* category
* owner username

Boards searchable by:

* title
* description
* owner username

Users searchable by:

* username
* display name

## 16.3 Search Filters

MVP filters:

* content type
* category
* newest
* most saved
* most liked

## 16.4 Search Safety

Search results must exclude:

* rejected Pins.
* removed Pins.
* suspended users.
* private Boards, if private Boards exist.
* content currently pending review.

---

## 17. Notification Specification

## 17.1 MVP Notifications

The system supports basic in-app notifications.

Events:

* User followed you.
* User liked your Pin.
* User saved your Pin.
* Uploaded Pin was approved.
* Uploaded Pin was rejected.
* Report was resolved.
* Admin warning.

## 17.2 Notification Fields

* id
* user_id
* type
* actor_id
* target_type
* target_id
* message
* is_read
* created_at

---

## 18. Admin Panel Specification

## 18.1 Admin Dashboard

Admin dashboard shows:

* Total users.
* New users.
* Total Pins.
* Pending moderation count.
* Reports count.
* Removed content count.
* Upload volume.
* Ad render events.
* Basic engagement metrics.

## 18.2 Moderation Queue

Moderation queue must support:

* Filter by status.
* Filter by SafeSearch risk.
* Filter by category.
* Sort by newest.
* Sort by highest risk.
* Sort by most reported.
* Approve action.
* Reject action.
* Remove action.
* Restore action.
* Add review note.

## 18.3 Report Management

Report dashboard shows:

* Reported target.
* Reporter.
* Reason.
* Description.
* Report count.
* Target status.
* Review action.
* Resolve action.

## 18.4 User Management

Admin can:

* View user profile.
* View upload history.
* View report history.
* View moderation history.
* Warn user.
* Suspend user.
* Ban user.
* Restore user.

## 18.5 Category Management

Admin can:

* Create category.
* Edit category.
* Disable category.
* Reorder category.
* Set category as sensitive.

## 18.6 Moderation Settings

Super Admin can configure:

* SafeSearch thresholds.
* Report thresholds.
* Upload limits.
* Review rules.
* Trusted user rules.

## 18.7 Audit Log

Admin panel must provide audit logs for:

* Moderation decisions.
* User suspension.
* Category changes.
* Ad setting changes.
* System setting changes.

---

## 19. Data Model

## 19.1 User

Fields:

* id
* username
* display_name
* email
* phone
* password_hash
* avatar_url
* bio
* website_url
* status
* role
* trust_score
* created_at
* updated_at

Statuses:

* active
* suspended
* banned
* deleted

Roles:

* user
* trusted_user
* moderator
* super_admin

## 19.2 UserSession

Fields:

* id
* user_id
* session_token_hash
* device_info
* ip_address
* expires_at
* created_at

## 19.3 Pin

Fields:

* id
* owner_user_id
* title
* description
* category_id
* status
* moderation_status
* image_original_url
* image_thumbnail_url
* image_feed_url
* image_detail_url
* width
* height
* dominant_color
* like_count
* save_count
* share_count
* report_count
* view_count
* created_at
* updated_at

Statuses:

* draft
* processing
* pending_review
* published
* rejected
* removed
* deleted

## 19.4 ImageAsset

Fields:

* id
* pin_id
* owner_user_id
* original_storage_key
* thumbnail_storage_key
* feed_storage_key
* detail_storage_key
* mime_type
* original_size_bytes
* processed_size_bytes
* width
* height
* status
* created_at

## 19.5 ModerationResult

Fields:

* id
* pin_id
* provider
* adult_likelihood
* racy_likelihood
* violence_likelihood
* medical_likelihood
* spoof_likelihood
* decision
* raw_response_json
* reviewed_by
* review_note
* created_at

Decisions:

* auto_approved
* auto_rejected
* human_review_required
* manually_approved
* manually_rejected

## 19.6 Board

Fields:

* id
* owner_user_id
* title
* description
* cover_pin_id
* visibility
* pin_count
* follower_count
* created_at
* updated_at

Visibility:

* public
* private

## 19.7 BoardPin

Fields:

* id
* board_id
* pin_id
* saved_by_user_id
* note
* created_at

Unique constraint:

* board_id + pin_id

## 19.8 Like

Fields:

* id
* user_id
* pin_id
* created_at

Unique constraint:

* user_id + pin_id

## 19.9 Follow

Fields:

* id
* follower_user_id
* target_type
* target_id
* created_at

Target types:

* user
* board
* category

## 19.10 Report

Fields:

* id
* reporter_user_id
* target_type
* target_id
* reason
* description
* status
* reviewed_by
* review_note
* created_at
* updated_at

Reasons:

* adult_content
* nudity
* sexual_content
* racy_content
* violence
* medical_sensitive
* spam
* harassment
* illegal_content
* copyright
* other

## 19.11 Category

Fields:

* id
* name
* slug
* parent_id
* description
* icon_url
* is_sensitive
* status
* created_at
* updated_at

## 19.12 UserInterest

Fields:

* id
* user_id
* category_id
* score
* source
* updated_at

Sources:

* onboarding
* like
* save
* view
* follow
* search
* admin_seed

## 19.13 UserEvent

Fields:

* id
* user_id
* session_id
* event_type
* target_type
* target_id
* metadata_json
* created_at

## 19.14 AdEvent

Fields:

* id
* user_id
* session_id
* provider
* placement
* event_type
* ad_reference
* metadata_json
* created_at

## 19.15 Notification

Fields:

* id
* user_id
* type
* actor_id
* target_type
* target_id
* message
* is_read
* created_at

## 19.16 AuditLog

Fields:

* id
* actor_id
* actor_role
* action
* target_type
* target_id
* old_value_json
* new_value_json
* note
* ip_address
* created_at

---

## 20. API Specification — High-Level

## 20.1 Auth API

### POST /auth/register

Creates a new user.

Request:

* email or phone
* password
* username
* accept_terms

Response:

* user
* verification_required

### POST /auth/login

Authenticates user.

Request:

* email_or_phone
* password

Response:

* access_token
* user

### POST /auth/logout

Ends current session.

### POST /auth/verify

Verifies email or phone.

### POST /auth/forgot-password

Starts password reset flow.

---

## 20.2 User API

### GET /users/me

Returns current user profile.

### PATCH /users/me

Updates current user profile.

### GET /users/:username

Returns public user profile.

### POST /users/:id/follow

Follows a user.

### DELETE /users/:id/follow

Unfollows a user.

---

## 20.3 Pin API

### POST /pins

Creates a Pin upload request.

Request:

* image_file
* title
* description
* category_id
* board_id optional

Response:

* pin_id
* status

### GET /pins/:id

Returns Pin detail.

### PATCH /pins/:id

Updates Pin metadata if owner is authorized.

### DELETE /pins/:id

Deletes or hides own Pin, subject to policy.

### POST /pins/:id/like

Likes a Pin.

### DELETE /pins/:id/like

Unlikes a Pin.

### POST /pins/:id/save

Saves Pin into Board.

Request:

* board_id

### POST /pins/:id/share

Records share event and returns public link.

### POST /pins/:id/report

Creates a report.

---

## 20.4 Board API

### POST /boards

Creates Board.

Request:

* title
* description
* visibility

### GET /boards/:id

Returns Board detail.

### PATCH /boards/:id

Updates Board.

### DELETE /boards/:id

Deletes Board.

### POST /boards/:id/pins

Adds Pin to Board.

### DELETE /boards/:id/pins/:pinId

Removes Pin from Board.

### POST /boards/:id/follow

Follows Board.

### DELETE /boards/:id/follow

Unfollows Board.

---

## 20.5 Feed API

### GET /feed/home

Returns personalized Home Feed.

Query:

* cursor
* limit

Response:

* items
* next_cursor
* has_more

### GET /feed/following

Returns Pins from followed users and boards.

### GET /feed/trending

Returns trending Pins.

### GET /feed/category/:slug

Returns category feed.

---

## 20.6 Search API

### GET /search

Query:

* q
* type
* category
* sort

Response:

* pins
* boards
* users

---

## 20.7 Upload and Image API

### POST /uploads/image

Uploads image and starts processing.

### GET /uploads/:id/status

Returns processing and moderation status.

---

## 20.8 Admin API

### GET /admin/moderation-queue

Returns pending moderation items.

### POST /admin/pins/:id/approve

Approves Pin.

### POST /admin/pins/:id/reject

Rejects Pin.

### POST /admin/pins/:id/remove

Removes published Pin.

### POST /admin/pins/:id/restore

Restores removed Pin.

### GET /admin/reports

Returns reports.

### POST /admin/reports/:id/resolve

Resolves report.

### GET /admin/users

Returns users.

### POST /admin/users/:id/suspend

Suspends user.

### POST /admin/users/:id/ban

Bans user.

### GET /admin/audit-logs

Returns audit logs.

---

## 20.9 Ads API

### GET /ads/feed-slot

Returns feed ad slot configuration or provider payload.

### POST /ads/impression

Records internal impression event.

### POST /ads/click

Records internal click event.

---

## 21. UI / Page Specification

## 21.1 Public Landing Page

Components:

* Logo.
* Search bar.
* Hero section.
* Popular categories.
* Sample image grid.
* Register button.
* Login button.
* Footer links.

## 21.2 Register Page

Fields:

* Email or phone.
* Username.
* Password.
* Terms acceptance.

## 21.3 Onboarding Interests Page

User selects initial interests.

Rules:

* Minimum selection required.
* Selected interests initialize UserInterest scores.

## 21.4 Home Feed Page

Components:

* Top navigation.
* Search bar.
* Masonry image grid.
* Pin cards.
* Native ad cards.
* Infinite scroll.
* Save button.
* Like button.
* Share button.
* Report menu.

## 21.5 Pin Detail Page

Components:

* Main image.
* Title.
* Description.
* Owner profile mini-card.
* Save button.
* Like button.
* Share button.
* Report button.
* Similar Pins section.

## 21.6 Upload Page

Components:

* Drag-and-drop upload.
* Image preview.
* Title field.
* Description field.
* Category dropdown.
* Optional Board selector.
* Content policy notice.
* Submit button.
* Upload status.

## 21.7 Profile Page

Components:

* Avatar.
* Display name.
* Username.
* Bio.
* Website link.
* Follow button.
* Follower count.
* Following count.
* Pins tab.
* Boards tab.
* Saved tab.

## 21.8 Board Page

Components:

* Board cover.
* Board title.
* Description.
* Follow button.
* Share button.
* Pin grid.
* Edit controls for owner.

## 21.9 Search Page

Components:

* Search input.
* Result tabs.
* Filters.
* Masonry result grid.

## 21.10 Notifications Page

Components:

* Notification list.
* Read/unread status.
* Link to target.

## 21.11 Admin Panel

Components:

* Sidebar.
* Dashboard cards.
* Moderation queue.
* Report table.
* User table.
* Category management.
* Settings.
* Audit logs.

---

## 22. Technical Architecture

## 22.1 Recommended Stack

Frontend:

* Next.js
* TypeScript
* Tailwind CSS
* TanStack Query
* Masonry grid library or custom CSS grid

Backend:

* Next.js API Routes for fast MVP

Alternative backend for larger scale:

* NestJS
* TypeScript

Database:

* PostgreSQL
* Prisma ORM

Storage:

* S3-compatible object storage

Image Processing:

* Sharp
* Background worker

Queue:

* Redis
* BullMQ

Moderation:

* Google Vision SafeSearch adapter

Ads:

* Yektanet native ad adapter

Deployment:

* VPS or cloud deployment
* CDN/object storage for images

## 22.2 Service Modules

Core modules:

1. Auth Module.
2. User Module.
3. Pin Module.
4. Board Module.
5. Feed Module.
6. Search Module.
7. Upload Module.
8. Image Processing Module.
9. Moderation Module.
10. Ad Module.
11. Notification Module.
12. Admin Module.
13. Analytics/Event Module.

## 22.3 Architecture Rule

The feed must not query raw image originals. It must use optimized feed image variants.

## 22.4 Provider Abstractions

External integrations must use interfaces:

* SafeSearchProvider
* AdProvider
* StorageProvider
* NotificationProvider

Initial implementations:

* GoogleVisionSafeSearchProvider
* YektanetAdProvider
* S3StorageProvider

---

## 23. Security Requirements

## 23.1 Authentication Security

Requirements:

* Password hashing using strong algorithm.
* Rate limiting on login.
* Session expiration.
* Secure cookies or token handling.
* CSRF protection if cookie-based auth is used.
* Input validation.
* Email/phone verification.

## 23.2 Upload Security

Requirements:

* Validate file extension.
* Validate MIME type.
* Validate file signature.
* Limit file size.
* Strip metadata.
* Prevent direct execution of uploaded files.
* Store uploads outside application runtime.
* Use signed URLs if needed.
* Rate limit uploads.

## 23.3 Admin Security

Requirements:

* Admin routes must require admin role.
* All admin actions must be audited.
* Moderator cannot change system settings.
* Super Admin actions must be logged.

## 23.4 Abuse Prevention

Requirements:

* Upload limits for new users.
* Report spam prevention.
* Bot detection basics.
* Rate limiting for likes, saves, follows, reports.
* Suspicious user flagging.

---

## 24. Privacy Requirements

## 24.1 User Data

The platform stores:

* Account information.
* Profile information.
* Uploaded images.
* Boards.
* Saves.
* Likes.
* Follows.
* Reports.
* Behavioral events.

## 24.2 Privacy Principles

1. User passwords must never be stored in plain text.
2. Private data must not be exposed through public APIs.
3. User behavior data should be used for recommendation and analytics.
4. Admin access must be controlled and audited.
5. Deleted users should be handled according to product policy.

---

## 25. Non-Functional Requirements

## 25.1 Performance

Requirements:

* Home Feed first load should be fast on mobile networks.
* Feed API should return results within acceptable latency.
* Images must be lazy-loaded.
* Image variants must be optimized.
* Infinite scroll must not overload the backend.

## 25.2 Scalability

The system must support growth in:

* Users.
* Uploaded images.
* Feed requests.
* Search queries.
* Ad render events.
* Moderation queue volume.

## 25.3 Reliability

Requirements:

* Failed ad provider must not break feed.
* Failed SafeSearch request must move image to human review.
* Failed image processing must show clear status.
* Background jobs must be retryable.
* Upload state must be recoverable.

## 25.4 Maintainability

Requirements:

* Code must be modular.
* External providers must be abstracted.
* Business rules must not be hardcoded everywhere.
* Moderation thresholds must be configurable.
* Feed ranking should be isolated in a Feed Service.

## 25.5 Observability

The system should log:

* Upload failures.
* Image processing failures.
* SafeSearch failures.
* Ad provider failures.
* Feed API errors.
* Admin actions.
* Report spikes.

---

## 26. MVP Acceptance Criteria

The MVP is complete when:

1. User can register and login.
2. User can select initial interests.
3. User can view Home Feed.
4. User can upload image.
5. Uploaded image is processed.
6. Uploaded image is checked by SafeSearch.
7. Safe content can be published.
8. Risky content enters moderation queue.
9. Admin can approve or reject content.
10. User can open Pin detail page.
11. User can like Pin.
12. User can create Board.
13. User can save Pin into Board.
14. User can follow another user.
15. User can follow Board.
16. User can search Pins, Boards, and Users.
17. User can report content.
18. Admin can review reports.
19. Native ad appears after every 6 or 7 organic Pins.
20. Feed works even if ads fail.
21. Images load through optimized variants.
22. Site is usable on mobile web.
23. Basic user events are recorded.
24. Feed uses basic personalization.
25. Rejected or removed content is not public.

---

## 27. Implementation Roadmap

## Phase 0 — Project Foundation

Deliverables:

1. Repository setup.
2. Next.js TypeScript setup.
3. Tailwind setup.
4. PostgreSQL setup.
5. Prisma schema setup.
6. Authentication base.
7. Base layout.
8. Environment configuration.
9. Deployment pipeline.

## Phase 1 — Core Image Platform

Deliverables:

1. User profile.
2. Image upload.
3. Image validation.
4. Image processing.
5. Pin creation.
6. Pin detail page.
7. Simple public feed.

## Phase 2 — Moderation System

Deliverables:

1. Google Vision SafeSearch adapter.
2. Moderation result storage.
3. Decision rule engine.
4. Admin moderation queue.
5. Approve/reject/remove flows.
6. Report content flow.

## Phase 3 — Boards and Social Actions

Deliverables:

1. Board creation.
2. Save Pin to Board.
3. Like Pin.
4. Follow User.
5. Follow Board.
6. Profile tabs.
7. Notifications.

## Phase 4 — Personalized Feed

Deliverables:

1. UserInterest model.
2. UserEvent tracking.
3. Feed candidate generation.
4. Feed ranking.
5. Cursor pagination.
6. Category feeds.
7. Trending feed.

## Phase 5 — Native Ads

Deliverables:

1. AdProvider interface.
2. Yektanet adapter.
3. Feed Ad Card.
4. Ad insertion after 6 or 7 Pins.
5. Ad failure handling.
6. Internal ad event logging.

## Phase 6 — Polish and Beta Launch

Deliverables:

1. Mobile responsive polish.
2. SEO basics.
3. Performance optimization.
4. Admin analytics.
5. Seed content.
6. Beta launch.
7. Bug fixing.
8. User feedback collection.

---

## 28. AI/Codex Development Task Breakdown

## Epic 1 — Foundation

Tasks:

1. Create Next.js project.
2. Add TypeScript.
3. Add Tailwind CSS.
4. Add Prisma.
5. Configure PostgreSQL.
6. Create base folder structure.
7. Create environment variable structure.
8. Create global layout.
9. Create reusable UI components.

## Epic 2 — Authentication

Tasks:

1. Implement register API.
2. Implement login API.
3. Implement logout API.
4. Implement password hashing.
5. Implement session handling.
6. Implement auth middleware.
7. Create register page.
8. Create login page.
9. Create current user API.

## Epic 3 — User and Profile

Tasks:

1. Create User model.
2. Create Profile page.
3. Create Edit Profile page.
4. Add avatar upload.
5. Add follow user.
6. Add follower/following counts.

## Epic 4 — Pin Upload

Tasks:

1. Create Pin model.
2. Create ImageAsset model.
3. Create upload page.
4. Validate file type.
5. Validate file size.
6. Process image with Sharp.
7. Generate image variants.
8. Store image in object storage.
9. Create Pin record.
10. Show upload status.

## Epic 5 — Moderation

Tasks:

1. Create ModerationResult model.
2. Implement SafeSearch provider interface.
3. Implement Google Vision provider.
4. Implement moderation rule engine.
5. Add pending review state.
6. Add admin moderation queue.
7. Implement approve action.
8. Implement reject action.
9. Implement remove action.
10. Add moderation audit logs.

## Epic 6 — Feed

Tasks:

1. Create Feed API.
2. Implement simple feed.
3. Add cursor pagination.
4. Add feed card component.
5. Add masonry layout.
6. Add user event tracking.
7. Add interest scoring.
8. Implement basic ranking.
9. Add seen content penalty.

## Epic 7 — Boards

Tasks:

1. Create Board model.
2. Create BoardPin model.
3. Create board creation modal.
4. Create board page.
5. Add save-to-board modal.
6. Prevent duplicate board saves.
7. Add board cover logic.
8. Add follow board.

## Epic 8 — Social Actions

Tasks:

1. Create Like model.
2. Implement like/unlike.
3. Implement share event.
4. Implement report model.
5. Implement report modal.
6. Implement notification model.
7. Add basic notifications.

## Epic 9 — Search

Tasks:

1. Implement basic search API.
2. Search Pins.
3. Search Boards.
4. Search Users.
5. Create search page.
6. Add filters.

## Epic 10 — Ads

Tasks:

1. Create AdProvider interface.
2. Create YektanetAdProvider.
3. Create AdCard component.
4. Insert ad after every 6 or 7 Pins.
5. Add ad event logging.
6. Add ad failure fallback.

## Epic 11 — Admin Panel

Tasks:

1. Create admin layout.
2. Add role-based admin access.
3. Build moderation queue.
4. Build reports dashboard.
5. Build user management page.
6. Build category management.
7. Build audit log viewer.
8. Add moderation settings.

---

## 29. Initial Categories

Suggested MVP categories:

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

Persian display names can be added in the UI.

---

## 30. Seed Content Strategy

The platform needs initial content before user-generated content grows.

Seed content sources must be legally safe.

Options:

1. Manually upload curated royalty-free images.
2. Use licensed stock images.
3. Use user-owned content.
4. Use AI-generated images only if legally and ethically acceptable.
5. Avoid scraping copyrighted content without permission.

Seed content should cover:

* Popular categories.
* High-quality visuals.
* Safe content.
* Locally relevant interests.
* Commercially attractive categories.

---

## 31. Open Decisions

The following decisions must be finalized before implementation:

1. Final product name.
2. Final logo and brand identity.
3. Email-based or phone-based registration.
4. Object storage provider.
5. CDN provider.
6. Deployment location.
7. Final SafeSearch thresholds.
8. Whether private Boards are included in MVP.
9. Whether guests can browse full feed.
10. Exact Yektanet integration method.
11. Exact upload limit for new users.
12. Whether all user uploads require manual review at launch.
13. Final category list.
14. Copyright policy.
15. Terms of service.
16. Privacy policy.
17. Whether comments are excluded completely from MVP.
18. Whether users can delete uploaded Pins permanently.
19. Whether admin can edit user-uploaded metadata.
20. Whether the product starts with invite-only beta.

---

## 32. Recommended MVP Launch Strategy

### 32.1 Private Alpha

Audience:

* Internal team.
* Friends.
* Selected users.

Goals:

* Test upload.
* Test moderation.
* Test feed speed.
* Test save-to-board behavior.
* Test mobile web.

### 32.2 Closed Beta

Audience:

* Small group of real users.
* Content creators.
* Store owners.
* Visual communities.

Goals:

* Collect user behavior.
* Improve feed.
* Validate categories.
* Measure retention.
* Test native ad placement.

### 32.3 Public MVP

Audience:

* Persian-speaking users interested in visual discovery.

Goals:

* Grow content.
* Improve personalization.
* Activate Yektanet native ads.
* Measure ad impact.
* Test monetization.

---

## 33. Key Metrics

## 33.1 User Metrics

* New users.
* Active users.
* Returning users.
* Session duration.
* Feed scroll depth.
* Pin opens.
* Saves per user.
* Boards created per user.
* Follow actions.

## 33.2 Content Metrics

* Pins uploaded.
* Pins approved.
* Pins rejected.
* Pins reported.
* Average moderation time.
* Most active categories.
* Most saved Pins.

## 33.3 Feed Metrics

* Feed load time.
* Click-through rate on Pins.
* Save rate.
* Like rate.
* Report rate.
* Duplicate exposure rate.
* Ad insertion frequency.

## 33.4 Ad Metrics

* Ad render count.
* Ad impression attempts.
* Ad clicks.
* Ad failure rate.
* Ad CTR.
* User drop-off after ad exposure.

## 33.5 Safety Metrics

* Auto-approval rate.
* Human review rate.
* Rejection rate.
* False positive moderation rate.
* False negative moderation rate.
* Report resolution time.

---

## 34. Risks and Mitigations

## 34.1 Content Safety Risk

Risk:

Users may upload inappropriate content.

Mitigation:

* SafeSearch moderation.
* Human review.
* Report system.
* Upload limits.
* User trust score.
* Admin audit log.

## 34.2 High Storage and Bandwidth Cost

Risk:

Image-heavy platforms can become expensive.

Mitigation:

* WebP conversion.
* Image variants.
* CDN.
* Lazy loading.
* Upload limits.
* Compression.
* Delete rejected originals if policy allows.

## 34.3 Weak Recommendation Quality

Risk:

Users may not find the feed interesting.

Mitigation:

* Onboarding interests.
* Save-based personalization.
* Trending content.
* Curated seed content.
* User event tracking.

## 34.4 Low User-Generated Content

Risk:

Platform may feel empty.

Mitigation:

* Seed content.
* Invite creators.
* Admin-curated boards.
* Category landing pages.

## 34.5 Ads Hurting UX

Risk:

Users may feel annoyed by ads.

Mitigation:

* Insert ads only after 6 or 7 organic posts.
* Avoid first-position ads.
* Label ads clearly.
* Monitor ad CTR and drop-off.
* Make frequency configurable.

## 34.6 Provider Dependency

Risk:

Google Vision or Yektanet may fail or become unavailable.

Mitigation:

* Provider abstraction.
* Fallback moderation queue.
* Ad failure handling.
* Replaceable provider interface.

---

## 35. Final MVP Definition

The MVP is a working web platform where:

1. Users can register and login.
2. Users can select interests.
3. Users can browse a personalized image feed.
4. Users can upload images.
5. Uploaded images are optimized.
6. Uploaded images are checked by SafeSearch.
7. Risky images are reviewed by admins.
8. Approved images appear in public feeds.
9. Users can like images.
10. Users can save images into boards.
11. Users can create and manage boards.
12. Users can follow users and boards.
13. Users can report inappropriate content.
14. Admins can moderate content and reports.
15. Native ads appear naturally inside the feed.
16. The site works well on mobile web.
17. The system collects behavioral events for recommendation improvement.
18. The image pipeline controls quality, size, and loading speed.

This MVP is ready for AI-assisted development when the database schema, API contracts, and screen-by-screen implementation tasks are derived from this SDD.
