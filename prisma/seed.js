const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const categories = [
  ["Home Decor", "home-decor"],
  ["Fashion", "fashion"],
  ["Beauty", "beauty"],
  ["Food", "food"],
  ["Travel", "travel"],
  ["Photography", "photography"],
  ["Art", "art"],
  ["Wedding", "wedding"],
  ["Kitchen", "kitchen"],
  ["Gift Ideas", "gift-ideas"],
  ["Graphic Design", "graphic-design"],
  ["Fitness", "fitness"],
  ["Architecture", "architecture"],
  ["Handmade", "handmade"],
  ["Lifestyle", "lifestyle"],
  ["Cars", "cars"],
  ["Technology", "technology"],
  ["Education", "education"],
  ["Nature", "nature"],
  ["Minimal Design", "minimal-design"],
];

const systemSettings = [
  {
    key: "safe_search_thresholds",
    description: "Google Vision SafeSearch moderation thresholds.",
    valueJson: {
      adult: {
        reject: ["LIKELY", "VERY_LIKELY"],
        review: ["POSSIBLE", "UNKNOWN"],
      },
      racy: {
        reject: ["LIKELY", "VERY_LIKELY"],
        review: ["POSSIBLE", "UNKNOWN"],
      },
      violence: {
        reject: ["LIKELY", "VERY_LIKELY"],
        review: ["POSSIBLE", "UNKNOWN"],
      },
      medical: {
        reject: [],
        review: ["POSSIBLE", "LIKELY", "VERY_LIKELY", "UNKNOWN"],
      },
    },
  },
  {
    key: "upload_limits",
    description: "Default image upload size and MIME type limits.",
    valueJson: {
      maxImageSizeMb: 10,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      maxUploadsPerDayForNewUser: 10,
    },
  },
  {
    key: "feed_ad_frequency",
    description: "Native ad insertion frequency for feed surfaces.",
    valueJson: {
      homeFeedInlineAdEvery: 6,
      disableFirstPositionAd: true,
      preventBackToBackAds: true,
    },
  },
];

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getAdminSeedData() {
  const verifiedAt = new Date();

  return {
    email: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
    username: process.env.SEED_ADMIN_USERNAME ?? "superadmin",
    displayName: process.env.SEED_ADMIN_DISPLAY_NAME ?? "Super Admin",
    passwordHash: requiredEnv("SEED_ADMIN_PASSWORD_HASH"),
    verifiedAt,
  };
}

async function seedCategories() {
  for (const [name, slug] of categories) {
    await prisma.category.upsert({
      where: { slug },
      update: {
        name,
        status: "ACTIVE",
      },
      create: {
        name,
        slug,
        status: "ACTIVE",
        isSensitive: false,
      },
    });
  }
}

async function seedSuperAdmin(admin) {
  await prisma.user.upsert({
    where: { email: admin.email },
    update: {
      username: admin.username,
      displayName: admin.displayName,
      passwordHash: admin.passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: admin.verifiedAt,
    },
    create: {
      username: admin.username,
      displayName: admin.displayName,
      email: admin.email,
      passwordHash: admin.passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      trustScore: 100,
      termsAcceptedAt: admin.verifiedAt,
      emailVerifiedAt: admin.verifiedAt,
    },
  });
}

async function seedSystemSettings() {
  for (const setting of systemSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {
        valueJson: setting.valueJson,
        description: setting.description,
      },
      create: setting,
    });
  }
}

async function seedAdSlot() {
  const existingSlot = await prisma.adSlot.findFirst({
    where: {
      placement: "HOME_FEED_INLINE",
      provider: "YEKTANET",
      name: "Home Feed Native Inline",
    },
  });

  const data = {
    placement: "HOME_FEED_INLINE",
    provider: "YEKTANET",
    name: "Home Feed Native Inline",
    isActive: true,
    frequencyEvery: 6,
  };

  if (existingSlot) {
    await prisma.adSlot.update({
      where: { id: existingSlot.id },
      data,
    });

    return;
  }

  await prisma.adSlot.create({ data });
}

async function main() {
  const admin = getAdminSeedData();

  await seedCategories();
  await seedSuperAdmin(admin);
  await seedSystemSettings();
  await seedAdSlot();

  console.log("Seed data created.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
