# Native Ads Setup

PinFa uses a provider-based native ad layer for feed ads. Stage 13 includes the
Yektanet provider adapter, local mock behavior, Home Feed insertion, and internal
ad event logging.

## Environment Variables

Optional Yektanet variables:

```env
YEKTANET_ENABLED=false
YEKTANET_PUBLISHER_ID=""
YEKTANET_WIDGET_ID=""
YEKTANET_PLACEMENT_ID=""
YEKTANET_SCRIPT_URL="https://cdn.yektanet.com/native/native.js"
YEKTANET_LOCAL_MOCK_ENABLED=true
```

`YEKTANET_ENABLED=false` skips real provider requests. In local development, if
Yektanet IDs are missing and `YEKTANET_ENABLED` is not explicitly false, the
provider returns a safe mock native ad so the feed layout can be tested without
credentials. Set `YEKTANET_LOCAL_MOCK_ENABLED=true` to force mock ads while an
active database `AdSlot` exists.

For fallback testing only:

```env
YEKTANET_FORCE_FAILURE=true
```

This forces the provider to throw, records `AD_FAILED`, and keeps the feed
working without the ad item.

## AdSlot Configuration

The Home Feed reads the first active slot matching:

```text
placement = HOME_FEED_INLINE
provider = YEKTANET
isActive = true
```

The seed creates the MVP slot:

```text
name = Home Feed Native Inline
frequencyEvery = 6
```

`frequencyEvery` controls how many organic Pins appear before one ad. Invalid
values fall back to 6. If there is no active slot, the feed returns only organic
Pins.

Provider-specific overrides can be stored in `AdSlot.providerConfigJson`:

```json
{
  "mockEnabled": true,
  "title": "Sponsored idea",
  "body": "Local native ad preview",
  "callToAction": "Learn more",
  "clickUrl": "https://www.yektanet.com/",
  "imageUrl": "https://example.com/ad.webp"
}
```

Only safe `http` and `https` URLs are accepted. Provider secrets are not sent to
the client.

## Feed Insertion

`GET /api/feed/home` generates the organic feed first:

1. Guests get the simple public feed.
2. Authenticated users get the Stage 12 personalized ranking.
3. The ad insertion layer reads the active Home Feed `AdSlot`.
4. It inserts one `AD` item after every configured number of organic `PIN` items.

Ads are never inserted before the first organic Pin and are not placed
back-to-back. Ads do not count toward organic cursor pagination.

## Response Shape

The Home Feed response uses mixed item types:

```json
{
  "items": [
    { "type": "PIN", "pin": { "id": "..." } },
    { "type": "AD", "ad": { "adReference": "...", "slotId": "..." } }
  ],
  "organicItems": [],
  "nextCursor": "...",
  "hasMore": true
}
```

`organicItems` is included for compatibility and debugging. The UI renders
`PIN` items with `FeedPinCard` and `AD` items with `NativeAdCard`.

## Ad Events

Internal events are stored in `AdEvent`:

* `AD_SLOT_REQUESTED`
* `AD_SLOT_RENDERED`
* `AD_CLICKED`
* `AD_FAILED`

Clicks are logged through:

```text
POST /api/ads/events/click
```

The older `POST /api/ads/click` route remains as a compatibility wrapper.

## Disable Ads

Use either option:

1. Set the Home Feed `AdSlot.isActive` to `false`.
2. Set `YEKTANET_ENABLED=false` and do not enable local mock ads.

In both cases, the feed continues with organic Pins only.

## Testing

Fetch a feed page:

```powershell
Invoke-RestMethod "http://127.0.0.1:3000/api/feed/home?limit=10"
```

Check mixed item types:

```powershell
$feed = Invoke-RestMethod "http://127.0.0.1:3000/api/feed/home?limit=10"
$feed.items | Group-Object type
```

Record a click from an ad item:

```powershell
$ad = $feed.items | Where-Object type -eq "AD" | Select-Object -First 1
Invoke-RestMethod "http://127.0.0.1:3000/api/ads/events/click" `
  -Method Post `
  -ContentType "application/json" `
  -Body (@{ slotId = $ad.ad.slotId; adReference = $ad.ad.adReference } | ConvertTo-Json)
```

Check events in Prisma Studio or with a small Prisma query for `AdEvent` rows.
