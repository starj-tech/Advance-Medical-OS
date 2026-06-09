/**
 * Outbound notification channels beyond email. Env-gated with a log fallback,
 * so dev/preview works without provider credentials (same pattern as email).
 */

/** WhatsApp via the Meta Cloud API (no SDK; REST + fetch). */
export async function sendWhatsApp(
  to: string,
  text: string,
): Promise<{ delivered: boolean }> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    console.log(`[whatsapp:log] to=${to} text="${text.slice(0, 60)}" (WHATSAPP_* unset — not sent)`);
    return { delivered: false };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    });
    if (!res.ok) {
      console.error("[whatsapp] send failed", res.status, await res.text());
      return { delivered: false };
    }
    return { delivered: true };
  } catch (e) {
    console.error("[whatsapp] send error", e);
    return { delivered: false };
  }
}

/** SMS placeholder — wire a provider (e.g. Twilio/Vonage) the same way. */
export async function sendSms(to: string, text: string): Promise<{ delivered: boolean }> {
  console.log(`[sms:log] to=${to} text="${text.slice(0, 60)}" (no SMS provider configured)`);
  return { delivered: false };
}
