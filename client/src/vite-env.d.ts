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
  /**
   * Sentry DSN for client crash reporting. Unset (the default) keeps the
   * app entirely SDK-free — see lib/observability.ts. The DSN is public
   * by design; it identifies the project, it does not authorise anything.
   */
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
