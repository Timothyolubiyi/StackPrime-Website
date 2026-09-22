import { NextResponse } from "next/server";

// PLACEHOLDER — real implementation still needed:
// 1. Verify the reCAPTCHA v3 token server-side (RECAPTCHA_SECRET_KEY).
// 2. Call the Zoho CRM/Forms API to store the lead (ZOHO_CLIENT_ID /
//    ZOHO_CLIENT_SECRET / ZOHO_REFRESH_TOKEN — see .env.example in the
//    infra repo).
// 3. Trigger the notification email to ZOHO_NOTIFICATION_EMAIL.
//
// Currently just logs and returns success so the frontend form is testable
// end-to-end before the Zoho integration is wired up.

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.name || !body.email || !body.message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  console.log("[contact] submission received (Zoho integration not yet wired):", {
    name: body.name,
    email: body.email,
    company: body.company,
  });

  return NextResponse.json({ status: "received" });
}
