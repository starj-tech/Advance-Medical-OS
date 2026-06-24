/** Session cookie name — identical to the main app so a session is valid across
 *  apps when both point at the same Supabase project and share a cookie domain.
 *  Kept dependency-free for edge middleware (no next/headers import). */
export const SESSION_COOKIE = "abecca_session";
