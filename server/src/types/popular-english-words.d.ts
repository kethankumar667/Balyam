/**
 * Hand-written shim for the `popular-english-words` npm package.
 *
 * The package ships no `.d.ts` and its only useful export is the
 * frequency-ranked word fetcher used by the Word Building dictionary
 * loader (common mode). Typing it minimally here keeps TypeScript happy
 * without an extra dev dep.
 */
declare module "popular-english-words" {
  interface PopularEnglishWordsApi {
    /** Returns the top-N most frequent English words, lowercase. */
    getMostPopular(n: number): string[];
  }
  export const words: PopularEnglishWordsApi;
}
