/**
 * The message from a caught value, or `fallback` when there isn't a usable one.
 *
 * `catch (err)` hands back `unknown`, and typing it `any` to read `.message`
 * turns the checker off for everything downstream. Anything can be thrown, so
 * only a real `Error` with text in it is trusted.
 */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message.trim() ? err.message : fallback;
}
