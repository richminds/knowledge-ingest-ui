/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KNOWLEDGE_ACCOUNT_ID?: string;
  /** Former name of VITE_KNOWLEDGE_ACCOUNT_ID, still read as a fallback. */
  readonly VITE_GUEST_ACCOUNT_ID?: string;
}
