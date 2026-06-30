import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { errors: { auth: "Authentication required." } },
      { status: 401 },
    );
  }

  const body = await readJson(request);
  const categoryIds = parseCategoryIds(body);

  if (categoryIds.length < 3) {
    return NextResponse.json(
      { errors: { categoryIds: "Select at least 3 interests." } },
      { status: 400 },
    );
  }

  const activeCategories = await prisma.category.findMany({
    where: {
      id: { in: categoryIds },
      status: "ACTIVE",
    },
    select: {
      id: true,
    },
  });
  const activeCategoryIds = activeCategories.map((category) => category.id);

  if (activeCategoryIds.length !== categoryIds.length) {
    return NextResponse.json(
      { errors: { categoryIds: "One or more selected categories are invalid." } },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.userInterest.deleteMany({
      where: {
        userId: user.id,
        source: "ONBOARDING",
        categoryId: {
          notIn: activeCategoryIds,
        },
      },
    }),
    ...activeCategoryIds.map((categoryId) =>
      prisma.userInterest.upsert({
        where: {
          userId_categoryId: {
            userId: user.id,
            categoryId,
          },
        },
        update: {
          score: 10,
          source: "ONBOARDING",
        },
        create: {
          userId: user.id,
          categoryId,
          score: 10,
          source: "ONBOARDING",
        },
      }),
    ),
  ]);

  const interests = await prisma.userInterest.findMany({
    where: {
      userId: user.id,
    },
    include: {
      category: true,
    },
    orderBy: {
      category: {
        name: "asc",
      },
    },
  });

  return NextResponse.json({ interests });
}

function parseCategoryIds(input: unknown) {
  if (
    typeof input !== "object" ||
    input === null ||
    !("categoryIds" in input) ||
    !Array.isArray(input.categoryIds)
  ) {
    return [];
  }

  return Array.from(
    new Set(
      input.categoryIds.filter(
        (categoryId): categoryId is string =>
          typeof categoryId === "string" && categoryId.length > 0,
      ),
    ),
  );
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
