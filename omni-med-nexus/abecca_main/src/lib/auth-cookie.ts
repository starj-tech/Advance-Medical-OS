/** Session cookie name — kept dependency-free so it can be imported from
 *  middleware (edge runtime), which must not pull in `next/headers`. */
export const SESSION_COOKIE = "abecca_session";
