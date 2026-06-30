import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookie,
  deleteSessionByToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await deleteSessionByToken(sessionToken);
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);

  return response;
}
