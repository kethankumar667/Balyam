import { BASE_URL } from "../metadata";

export interface WebSiteSchemaOptions {
  name?: string;
  alternateName?: string[];
  url?: string;
  description?: string;
  inLanguage?: string[];
  searchTargetUrl?: string;
}

/**
 * Builds a Schema.org WebSite JSON-LD object with Sitelinks SearchAction.
 * Conforms to Google Search Central structured data specifications.
 */
export function buildWebSiteSchema(options: WebSiteSchemaOptions = {}) {
  const {
    name = "BHALYAM · బాల్యం — Relive Childhood Nostalgia",
    alternateName = ["Bhalyam", "Balyam", "BHALYAM Games", "Bhalyam 90s Lounge"],
    url = BASE_URL,
    description = "The digital veranda for 90s Telugu & Indian kids. Play Hand Cricket, Ludo, Snakes & Ladders, Rummy, UNO, and nostalgic multiplayer games with friends.",
    inLanguage = ["en", "te", "hi"],
    searchTargetUrl = `${BASE_URL}/games?q={search_term_string}`,
  } = options;

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    alternateName,
    url,
    description,
    inLanguage,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: searchTargetUrl,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
