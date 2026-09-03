/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_URL?: string;
  /**
   * Supabase project URL and public anon key. Both unset is a supported
   * state — see lib/supabase/client.ts — and is what keeps `npm run dev`
   * free of infrastructure.
   */
  readonly VITE_SUPABASE_URL?: string;
  /** Newer projects call it "publishable"; older ones call it "anon". Either works. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** DPDP Section 13 grievance contact email address. Unset by default. */
  readonly VITE_PRIVACY_CONTACT_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
