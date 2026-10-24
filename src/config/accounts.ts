/**
 * The auth-service app account this console signs in under.
 *
 * Sent as `account_id` on sign-in, sign-up and password reset, exactly as
 * makemerich-frontend pins every call to MAKEMERICH_ACCOUNT_ID. Naming the
 * application is what lets auth-service check that the user actually belongs
 * to it, instead of accepting any valid credentials typed into any login form.
 * It is also the account the token is scoped to, so it arrives at
 * knowledge-service as X-Account-ID and becomes one of the caller's ACL
 * principals.
 *
 * A UUID minted by auth-service, not a slug: copy it out of the
 * account-management console. CONFIGURED, NOT COMPILED IN: it lives in .env
 * locally and in the deployment's environment (Vite inlines it at BUILD time,
 * so changing it means restarting the dev server or redeploying).
 *
 * VITE_GUEST_ACCOUNT_ID is the name this console used before (sign-ups were
 * pinned to the guest account); deployments that still set it keep working.
 */
export const KNOWLEDGE_ACCOUNT_ID: string = (
  import.meta.env.VITE_KNOWLEDGE_ACCOUNT_ID ||
  import.meta.env.VITE_GUEST_ACCOUNT_ID ||
  ""
).trim();

/**
 * Refuse to boot unconfigured rather than degrade quietly. auth-service skips
 * the membership check when `account_id` is absent, so an unset value would
 * not fail: it would let any account's credentials through this login form,
 * and park every sign-up in no application at all. A blank screen in front of
 * whoever deployed it is the better outcome.
 */
if (!KNOWLEDGE_ACCOUNT_ID) {
  throw new Error(
    "VITE_KNOWLEDGE_ACCOUNT_ID (or VITE_GUEST_ACCOUNT_ID) is not set. It names the auth-service app account this " +
      "console signs in under; set it in .env (copy .env.example) to the account_id " +
      "shown in the account-management console."
  );
}
