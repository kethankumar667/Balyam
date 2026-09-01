import { BASE_URL, DEFAULT_OG_IMAGE } from "../metadata";

export interface HowToStepConfig {
  name: string;
  text: string;
  url?: string;
  image?: string;
}

export interface HowToConfig {
  name: string;
  description: string;
  steps: HowToStepConfig[];
  totalTime?: string; // ISO 8601, e.g. "PT5M"
  image?: string;
  tools?: string[];
  url?: string;
}

/**
 * Builds a Schema.org HowTo JSON-LD object.
 * Conforms to Google Search Central HowTo specifications.
 */
export function buildHowToSchema(config: HowToConfig) {
  const {
    name,
    description,
    steps,
    totalTime = "PT5M",
    image = DEFAULT_OG_IMAGE,
    tools = ["Web Browser (Smartphone, Tablet, or PC)"],
    url = `${BASE_URL}/how-to-play`,
  } = config;

  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    url,
    image,
    totalTime,
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "INR",
      value: "0",
    },
    tool: tools.map((t) => ({
      "@type": "HowToTool",
      name: t,
    })),
    step: steps.map((s, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: s.name,
      text: s.text,
      url: s.url || `${url}#step-${index + 1}`,
      ...(s.image ? { image: s.image } : {}),
    })),
  };
}

/**
 * Pre-configured HowTo for the BHALYAM platform onboarding experience.
 */
export function buildPlatformHowToPlaySchema() {
  return buildHowToSchema({
    name: "How to Play Multiplayer Childhood Games on BHALYAM",
    description:
      "A fast 4-step guide to choosing a nostalgic 90s Indian game, creating a private room code, inviting friends, and playing in real-time.",
    url: `${BASE_URL}/how-to-play`,
    image: DEFAULT_OG_IMAGE,
    totalTime: "PT2M",
    tools: [
      "Smartphone or Computer with Web Browser (Chrome, Safari, Firefox)",
      "Internet Connection",
    ],
    steps: [
      {
        name: "Choose a Game",
        text: "Browse our catalog of Indian childhood favorites — Hand Cricket, Ludo, Classic Rummy, UNO, Snakes & Ladders, and more.",
        url: `${BASE_URL}/games`,
      },
      {
        name: "Create or Join a Room",
        text: "Instantly generate a 6-character room code, or enter a friend's code to join their active lounge. No downloads required.",
        url: `${BASE_URL}/how-to-play`,
      },
      {
        name: "Invite Friends",
        text: "Share your room invite via WhatsApp, Web Share link, or QR code. Guests can jump straight into the match.",
        url: `${BASE_URL}/how-to-play`,
      },
      {
        name: "Play & Relive Memories",
        text: "Enjoy real-time turns, send nostalgic sound reactions, talk over WebRTC voice, and play instant rematches.",
        url: `${BASE_URL}/how-to-play`,
      },
    ],
  });
}
