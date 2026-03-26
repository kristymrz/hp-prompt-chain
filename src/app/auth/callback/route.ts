import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  // If the OAuth provider returned an error, forward it to the login page
  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");
  if (oauthError) {
    const message = oauthErrorDescription ?? oauthError;
    return NextResponse.redirect(
      `${siteUrl}/auth/login?error=${encodeURIComponent(message)}`
    );
  }

  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${siteUrl}/auth/login?error=${encodeURIComponent(error.message)}`
      );
    }
    return NextResponse.redirect(`${siteUrl}/`);
  }

  return NextResponse.redirect(
    `${siteUrl}/auth/login?error=${encodeURIComponent("No authorization code received. Please try again.")}`
  );
}
