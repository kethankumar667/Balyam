import { BASE_URL } from "../metadata";

export interface BreadcrumbItem {
  name: string;
  path: string;
}

/**
 * Builds a Schema.org BreadcrumbList JSON-LD object.
 * Conforms to Google Search Central Breadcrumb specifications.
 */
export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => {
      const fullUrl = item.path.startsWith("http")
        ? item.path
        : `${BASE_URL}${item.path.startsWith("/") ? item.path : `/${item.path}`}`;

      return {
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: fullUrl,
      };
    }),
  };
}
