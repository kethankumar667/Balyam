import { BASE_URL } from "../metadata";

export const DEFAULT_LOGO_IMAGE = `${BASE_URL}/Bhalyam-logo.png`;

export interface OrganizationSchemaOptions {
  name?: string;
  legalName?: string;
  url?: string;
  logo?: string;
  description?: string;
  founderName?: string;
  foundingDate?: string;
  contactEmail?: string;
  sameAs?: string[];
}

/**
 * Builds a Schema.org Organization JSON-LD object for BHALYAM.
 * Conforms to Google Knowledge Graph & Organization structured data specifications.
 */
export function buildOrganizationSchema(options: OrganizationSchemaOptions = {}) {
  const {
    name = "BHALYAM",
    legalName = "BHALYAM Digital Lounges",
    url = BASE_URL,
    logo = DEFAULT_LOGO_IMAGE,
    description = "The digital veranda for 90s childhood nostalgia games. Bringing back timeless multiplayer games for school crews, friends, and families worldwide.",
    founderName = "Kethan Kumar Gontla",
    foundingDate = "2026",
    contactEmail = "hello@bhalyam.app",
    sameAs = [
      "https://www.instagram.com/bhalyam",
      "https://wa.me/?text=Join%20me%20on%20BHALYAM%20-%20https%3A%2F%2Fbhalyam.onrender.com",
      "https://github.com/kethankumar667/Balyam",
    ],
  } = options;

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    legalName,
    url,
    logo,
    image: logo,
    description,
    foundingDate,
    founder: {
      "@type": "Person",
      name: founderName,
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: contactEmail,
        url: `${url}/contact`,
        availableLanguage: ["English", "Telugu", "Hindi"],
      },
    ],
    sameAs,
  };
}
