import { AUTH_COOKIE_NAME } from "@/constants/server";
import { createSessionClient } from "@/lib/appwrite";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/** Match login cookie options so the browser reliably clears it on logout. */
function clearAuthCookie() {
  const cookieStore = cookies();
  cookieStore.set(AUTH_COOKIE_NAME, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}

export const POST = async () => {
  try {
    try {
      const { account } = await createSessionClient();
      await account.deleteSession("current");
    } catch {
      // Missing / expired session or Appwrite error — still clear cookie locally.
    }

    clearAuthCookie();

    return NextResponse.json({ message: "Logout successful" });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
