import { AUTH_COOKIE_NAME } from "@/constants/server";
import { APP_CONFIG } from "@/lib/app-config";
import { createAdminClient } from "@/lib/appwrite";
import { signupSchema } from "@/validation/auth.validation";
import { ZodError } from "zod";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ID } from "node-appwrite";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.parse(body);
    const { email, name, password, accountType } = parsed;
    const shopNameTrimmed = (parsed.shopName ?? "").trim();

    const { account, databases } = await createAdminClient();
    const user = await account.create(ID.unique(), email, password, name);
    const session = await account.createEmailPasswordSession(email, password);

    let shopId: string | null = null;

    if (accountType === "seller") {
      const shop = await databases.createDocument(
        APP_CONFIG.APPWRITE.DATABASE_ID,
        APP_CONFIG.APPWRITE.SHOP_ID,
        ID.unique(),
        {
          shopName: shopNameTrimmed,
          userId: user.$id,
        }
      );
      shopId = shop.$id;
    }

    cookies().set(AUTH_COOKIE_NAME, session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({
      message: "User created successfully",
      userId: user.$id,
      shopId,
      accountType,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const msg = error.errors.map((e) => e.message).join("; ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
