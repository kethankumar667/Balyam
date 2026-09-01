import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { PUBLIC_ROUTES_METADATA } from "./metadata";

/**
 * useMetadata
 * Client-side React hook that synchronizes document head tags
 * (title, description, keywords, canonical, OpenGraph, Twitter)
 * dynamically on route changes.
 */
export function useMetadata() {
  const location = useLocation();

  useEffect(() => {
    if (typeof document === "undefined") return;

    // Routes with no catalog entry (e.g. /room/:code, /profile, /admin/*)
    // fall back to the home route's tags rather than leaving whatever the
    // previously-visited public route last wrote — otherwise a player who
    // navigates from a cataloged page (e.g. /games) into a room keeps that
    // page's title/OG/Twitter tags for the rest of the session.
    const meta = PUBLIC_ROUTES_METADATA[location.pathname] ?? PUBLIC_ROUTES_METADATA["/"];
    if (!meta) return;

    // Document Title
    document.title = meta.title;

    const setMetaTag = (nameOrProperty: "name" | "property", key: string, content: string) => {
      let el = document.querySelector(`meta[${nameOrProperty}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(nameOrProperty, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // Standard Meta
    setMetaTag("name", "description", meta.description);
    if (meta.keywords && meta.keywords.length > 0) {
      setMetaTag("name", "keywords", meta.keywords.join(", "));
    }

    // Canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", meta.canonical);

    // OpenGraph
    setMetaTag("property", "og:title", meta.ogTitle || meta.title);
    setMetaTag("property", "og:description", meta.ogDescription || meta.description);
    setMetaTag("property", "og:url", meta.canonical);
    setMetaTag("property", "og:image", meta.ogImage);
    setMetaTag("property", "og:image:secure_url", meta.ogImage);
    setMetaTag("property", "og:image:type", meta.ogImageType || (meta.ogImage.endsWith(".png") ? "image/png" : "image/jpeg"));
    setMetaTag("property", "og:image:width", meta.ogImageWidth || "1200");
    setMetaTag("property", "og:image:height", meta.ogImageHeight || "630");
    setMetaTag("property", "og:image:alt", meta.ogImageAlt || meta.ogTitle || meta.title);
    setMetaTag("property", "og:type", meta.ogType || "website");
    setMetaTag("property", "og:site_name", meta.ogSiteName || "BHALYAM · బాల్యం");
    setMetaTag("property", "og:locale", meta.ogLocale || "en_US");

    // Twitter / X
    setMetaTag("name", "twitter:card", meta.twitterCard || "summary_large_image");
    setMetaTag("name", "twitter:site", meta.twitterSite || "@bhalyam");
    setMetaTag("name", "twitter:creator", meta.twitterCreator || "@bhalyam");
    setMetaTag("name", "twitter:title", meta.twitterTitle || meta.ogTitle || meta.title);
    setMetaTag(
      "name",
      "twitter:description",
      meta.twitterDescription || meta.ogDescription || meta.description
    );
    setMetaTag("name", "twitter:image", meta.twitterImage || meta.ogImage);
    setMetaTag("name", "twitter:image:alt", meta.twitterImageAlt || meta.ogImageAlt || meta.ogTitle || meta.title);
  }, [location.pathname]);
}
