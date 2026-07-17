# I18N And RTL Notes

PinFa supports a lightweight bilingual UI for beta:

- Default locale: `fa`
- Secondary locale: `en`
- Locale cookie: `pinfa_locale`
- Persian direction: `rtl`
- English direction: `ltr`

## How Locale Is Selected

The app reads `pinfa_locale` from cookies on the server. If the cookie is missing or invalid, the app falls back to Persian (`fa`).

The language toggle in the main navigation writes:

- `pinfa_locale=fa`
- `pinfa_locale=en`

After changing the cookie, the current route is refreshed without changing the URL path.

## Files

- `src/lib/i18n/config.ts`: supported locales, default locale, cookie name, text direction.
- `src/lib/i18n/get-locale.ts`: server-side locale helper.
- `src/lib/i18n/t.ts`: dictionary lookup and string interpolation helper.
- `src/lib/i18n/dictionaries/fa.ts`: Persian UI copy.
- `src/lib/i18n/dictionaries/en.ts`: English UI copy.
- `src/components/LanguageToggle.tsx`: compact FA/EN toggle.
- `src/app/globals.css`: locale-aware font stack and RTL/LTR typography rules.

## Persian Font

Persian UI uses Vazirmatn as the primary font:

```css
html[lang="fa"] body,
html[dir="rtl"] body {
  font-family: Vazirmatn, system-ui, sans-serif;
}
```

The font is provided through `@fontsource/vazirmatn` and imported in `src/app/globals.css` at weights 400, 500, and 600. Only the package's Arabic/Persian Unicode subsets are loaded. These cover normal body text plus medium and semibold UI labels/headings without making the default UI feel heavy.

English/LTR UI keeps the Latin-friendly stack for Latin characters while Vazirmatn remains the script-specific fallback for Persian/Arabic characters:

```css
Vazirmatn, Arial, Helvetica, system-ui, sans-serif
```

Because the loaded Vazirmatn faces are restricted to Persian/Arabic Unicode ranges, English text falls through to Arial/Helvetica while Persian user-generated content still uses Vazirmatn even when the selected UI locale is English.

Technical/LTR fields such as email, phone, password, URL, code, and explicitly `dir="ltr"` values can keep the Latin stack even inside Persian pages.

## Adding UI Strings

Add the English key first in `src/lib/i18n/dictionaries/en.ts`, then add the Persian equivalent in `src/lib/i18n/dictionaries/fa.ts`.

Use natural Persian product language. Do not translate English wording mechanically.

Example:

```ts
t(dictionary, "nav.search")
t(dictionary, "profile.followerCount", { count: user.followerCount })
```

## RTL Notes

- The root layout sets `<html lang>` and `<html dir>` based on the active locale.
- Persian uses `dir="rtl"`.
- English uses `dir="ltr"`.
- Email, password, phone, URL, and username inputs should use `dir="ltr"` where appropriate.
- User-generated text fields can use `dir="auto"` when mixed Persian/English input is likely.
- Prefer logical Tailwind utilities such as `ms-*`, `me-*`, `start-*`, `end-*`, and `text-start` where alignment depends on direction.

## Header Logo

The header prefers `/public/brand/pinfa-logo.png` when present, then falls back to the existing WebP logo assets. The original image file is not modified.

The header renders the logo inside a circular CSS container using:

- fixed square dimensions
- `rounded-full`
- `overflow-hidden`
- a light border/shadow for clarity
- `object-cover` on the image to avoid stretching

## What Is Not Translated

The app does not translate user-generated or database content:

- Pin titles and descriptions
- Board titles and descriptions
- User display names and bios
- Uploaded image metadata
- Category names stored in the database
- Provider names such as Google Vision or Yektanet

Notification records may store English messages, but the UI renders localized messages from notification type where practical.

## Known Limitations

- Routes are not locale-prefixed. The active language is cookie-based.
- Server API error payloads remain stable and mostly English internally; UI fallbacks are localized where practical.
- Category names are displayed as stored because the database schema does not include localized category labels.
- Admin enum labels are localized in common UI surfaces, but some raw provider/status values may still appear for debugging clarity.
