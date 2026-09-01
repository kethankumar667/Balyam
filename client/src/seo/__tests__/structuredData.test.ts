import { describe, it, expect } from "vitest";
import {
  buildWebSiteSchema,
  buildOrganizationSchema,
  buildFaqSchema,
  buildHowToSchema,
  buildPlatformHowToPlaySchema,
  buildBreadcrumbSchema,
  buildGameApplicationSchema,
  buildGamesCatalogItemListSchema,
  SUPPORT_FAQS_LIST,
  HOW_TO_PLAY_FAQS_LIST,
} from "../schemas";
import {
  getStructuredDataForRoute,
  serializeJsonLd,
  STRUCTURED_DATA_GAMES,
} from "../structuredData";
import { BASE_URL } from "../metadata";

describe("Schema.org Structured Data Builders", () => {
  describe("WebSite Schema", () => {
    it("generates a valid WebSite schema with SearchAction", () => {
      const schema = buildWebSiteSchema();
      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("WebSite");
      expect(schema.name).toContain("BHALYAM");
      expect(schema.url).toBe(BASE_URL);
      expect(schema.potentialAction).toBeDefined();
      expect(schema.potentialAction["@type"]).toBe("SearchAction");
      expect(schema.potentialAction.target["@type"]).toBe("EntryPoint");
      expect(schema.potentialAction["query-input"]).toBe("required name=search_term_string");
    });
  });

  describe("Organization Schema", () => {
    it("generates a valid Organization schema with founder and contactPoint", () => {
      const schema = buildOrganizationSchema();
      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("Organization");
      expect(schema.name).toBe("BHALYAM");
      expect(schema.url).toBe(BASE_URL);
      expect(schema.logo).toContain("png");
      expect(schema.founder["@type"]).toBe("Person");
      expect(schema.founder.name).toBe("Kethan Kumar Gontla");
      expect(schema.contactPoint).toHaveLength(1);
      expect(schema.contactPoint[0]["@type"]).toBe("ContactPoint");
      expect(schema.sameAs).toBeInstanceOf(Array);
      expect(schema.sameAs.length).toBeGreaterThan(0);
    });
  });

  describe("FAQPage Schema", () => {
    it("generates a valid FAQPage schema from questions and answers", () => {
      const faqs = [
        { question: "How to play?", answer: "Click play now." },
        { question: "Is it free?", answer: "Yes, 100% free." },
      ];
      const schema = buildFaqSchema(faqs);
      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("FAQPage");
      expect(schema.mainEntity).toHaveLength(2);
      expect(schema.mainEntity[0]["@type"]).toBe("Question");
      expect(schema.mainEntity[0].name).toBe("How to play?");
      expect(schema.mainEntity[0].acceptedAnswer["@type"]).toBe("Answer");
      expect(schema.mainEntity[0].acceptedAnswer.text).toBe("Click play now.");
    });

    it("strips HTML tags from answer strings", () => {
      const faqs = [{ question: "Test?", answer: "Visit <a href='/link'>here</a> now <b>bold</b>." }];
      const schema = buildFaqSchema(faqs);
      expect(schema.mainEntity[0].acceptedAnswer.text).toBe("Visit here now bold.");
    });

    it("validates canonical support and how-to-play datasets", () => {
      expect(SUPPORT_FAQS_LIST.length).toBeGreaterThanOrEqual(15);
      expect(HOW_TO_PLAY_FAQS_LIST.length).toBeGreaterThanOrEqual(3);

      const supportSchema = buildFaqSchema(SUPPORT_FAQS_LIST);
      expect(supportSchema.mainEntity.length).toBe(SUPPORT_FAQS_LIST.length);
    });
  });

  describe("HowTo Schema", () => {
    it("generates a valid HowTo schema with steps", () => {
      const schema = buildPlatformHowToPlaySchema();
      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("HowTo");
      expect(schema.name).toBe("How to Play Multiplayer Childhood Games on BHALYAM");
      expect(schema.step).toHaveLength(4);
      expect(schema.step[0]["@type"]).toBe("HowToStep");
      expect(schema.step[0].position).toBe(1);
      expect(schema.step[0].name).toBe("Choose a Game");
      expect(schema.estimatedCost["@type"]).toBe("MonetaryAmount");
      expect(schema.estimatedCost.value).toBe("0");
    });
  });

  describe("BreadcrumbList Schema", () => {
    it("generates a valid BreadcrumbList schema with sequential indices and absolute URLs", () => {
      const breadcrumbs = [
        { name: "Home", path: "/" },
        { name: "Games", path: "/games" },
      ];
      const schema = buildBreadcrumbSchema(breadcrumbs);
      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("BreadcrumbList");
      expect(schema.itemListElement).toHaveLength(2);
      expect(schema.itemListElement[0].position).toBe(1);
      expect(schema.itemListElement[0].name).toBe("Home");
      expect(schema.itemListElement[0].item).toBe(`${BASE_URL}/`);
      expect(schema.itemListElement[1].position).toBe(2);
      expect(schema.itemListElement[1].name).toBe("Games");
      expect(schema.itemListElement[1].item).toBe(`${BASE_URL}/games`);
    });
  });

  describe("SoftwareApplication & Game Schema", () => {
    it("generates valid game schema with player counts and free pricing offer", () => {
      const schema = buildGameApplicationSchema({
        name: "Hand Cricket",
        slug: "handcricket",
        description: "Classroom finger cricket.",
        minPlayers: 2,
        maxPlayers: 2,
      });

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toContain("SoftwareApplication");
      expect(schema["@type"]).toContain("VideoGame");
      expect(schema.name).toBe("Hand Cricket");
      expect(schema.applicationCategory).toBe("GameApplication");
      expect(schema.numberOfPlayers["@type"]).toBe("QuantitativeValue");
      expect(schema.numberOfPlayers.minValue).toBe(2);
      expect(schema.numberOfPlayers.maxValue).toBe(2);
      expect(schema.offers["@type"]).toBe("Offer");
      expect(schema.offers.price).toBe("0");
    });

    it("generates valid ItemList schema for the games catalog", () => {
      const schema = buildGamesCatalogItemListSchema(STRUCTURED_DATA_GAMES);
      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("ItemList");
      expect(schema.numberOfItems).toBe(STRUCTURED_DATA_GAMES.length);
      expect(schema.itemListElement.length).toBe(STRUCTURED_DATA_GAMES.length);
      expect(schema.itemListElement[0]["@type"]).toBe("ListItem");
      expect(schema.itemListElement[0].position).toBe(1);
      expect(schema.itemListElement[0].url).toContain("/games?game=");
    });
  });
});

describe("Route-to-Structured-Data Engine (getStructuredDataForRoute)", () => {
  it("resolves WebSite and Organization for homepage (/)", () => {
    const schemas = getStructuredDataForRoute("/");
    expect(schemas).toHaveLength(2);
    const types = schemas.map((s) => (s as { "@type": string })["@type"]);
    expect(types).toContain("WebSite");
    expect(types).toContain("Organization");
  });

  it("resolves Organization and BreadcrumbList for /about", () => {
    const schemas = getStructuredDataForRoute("/about");
    expect(schemas).toHaveLength(2);
    const types = schemas.map((s) => (s as { "@type": string })["@type"]);
    expect(types).toContain("Organization");
    expect(types).toContain("BreadcrumbList");
  });

  it("resolves FAQPage and BreadcrumbList for /support", () => {
    const schemas = getStructuredDataForRoute("/support");
    expect(schemas).toHaveLength(2);
    const types = schemas.map((s) => (s as { "@type": string })["@type"]);
    expect(types).toContain("FAQPage");
    expect(types).toContain("BreadcrumbList");
  });

  it("resolves HowTo, FAQPage, and BreadcrumbList for /how-to-play", () => {
    const schemas = getStructuredDataForRoute("/how-to-play");
    expect(schemas).toHaveLength(3);
    const types = schemas.map((s) => (s as { "@type": string })["@type"]);
    expect(types).toContain("HowTo");
    expect(types).toContain("FAQPage");
    expect(types).toContain("BreadcrumbList");
  });

  it("resolves BreadcrumbList and ItemList for /games", () => {
    const schemas = getStructuredDataForRoute("/games");
    expect(schemas).toHaveLength(2);
    const types = schemas.map((s) => (s as { "@type": string })["@type"]);
    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("ItemList");
  });

  it("resolves SoftwareApplication and BreadcrumbList for individual games (e.g. /handcricket)", () => {
    const schemas = getStructuredDataForRoute("/handcricket");
    expect(schemas).toHaveLength(2);
    const types = schemas.map((s) => (s as { "@type": string | string[] })["@type"]);
    expect(types).toContainEqual(["SoftwareApplication", "VideoGame"]);
    expect(types).toContain("BreadcrumbList");
  });
});

describe("JSON-LD Serialization & Security (serializeJsonLd)", () => {
  it("serializes a single schema into valid JSON-LD", () => {
    const website = buildWebSiteSchema();
    const jsonStr = serializeJsonLd(website);
    const parsed = JSON.parse(jsonStr);
    expect(parsed["@type"]).toBe("WebSite");
  });

  it("wraps multiple schemas in a Schema.org @graph container", () => {
    const website = buildWebSiteSchema();
    const org = buildOrganizationSchema();
    const jsonStr = serializeJsonLd([website, org]);
    const parsed = JSON.parse(jsonStr);
    expect(parsed["@context"]).toBe("https://schema.org");
    expect(parsed["@graph"]).toBeInstanceOf(Array);
    expect(parsed["@graph"]).toHaveLength(2);
  });

  it("sanitizes against script injection (XSS defense)", () => {
    const malicious = {
      "@context": "https://schema.org",
      "@type": "Thing",
      name: "</script><script>alert(1)</script>",
    };
    const jsonStr = serializeJsonLd(malicious);
    expect(jsonStr).not.toContain("</script>");
    expect(jsonStr).toContain("\\u003c/script");
  });

  it("handles null and empty arrays gracefully", () => {
    expect(serializeJsonLd(null)).toBe("");
    expect(serializeJsonLd([])).toBe("");
  });
});
