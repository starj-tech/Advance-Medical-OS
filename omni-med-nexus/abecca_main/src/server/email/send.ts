/**
 * Transactional email — env-gated. With RESEND_API_KEY set we send via Resend's
 * REST API (no SDK dependency); otherwise we log to the console so dev/preview
 * works without a provider. Swap the provider here without touching callers.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const FROM = process.env.EMAIL_FROM || "Abecca <onboarding@abecca.health>";

export async function sendEmail(msg: EmailMessage): Promise<{ delivered: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email:log] to=${msg.to} subject="${msg.subject}" (RESEND_API_KEY unset — not sent)`);
    return { delivered: false };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text }),
    });
    if (!res.ok) {
      console.error("[email] send failed", res.status, await res.text());
      return { delivered: false };
    }
    return { delivered: true };
  } catch (e) {
    console.error("[email] send error", e);
    return { delivered: false };
  }
}
