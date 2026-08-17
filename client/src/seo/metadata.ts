export interface RouteMetadata {
  path: string;
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: string;
  canonical: string;
}

export const BASE_URL = "https://bhalyam.onrender.com";
export const DEFAULT_OG_IMAGE = `${BASE_URL}/Bhalyam-logo.png`;

export const PUBLIC_ROUTES_METADATA: Record<string, RouteMetadata> = {
  "/": {
    path: "/",
    title: "BHALYAM · బాల్యం — Relive Childhood Nostalgia",
    description:
      "The digital veranda for 90s Telugu & Indian kids. Play Hand Cricket, Ludo, Snakes & Ladders, Rummy, UNO, and retro nostalgia games with friends on your phone.",
    ogTitle: "BHALYAM · బాల్యం — Relive Childhood Nostalgia",
    ogDescription:
      "Relive childhood. Play Hand Cricket, Ludo, Snakes & Ladders, Rummy, UNO, and nostalgic 90s Indian multiplayer games together.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    canonical: `${BASE_URL}/`,
  },
  "/games": {
    path: "/games",
    title: "All Games | Bhalyam — 90s Childhood Games Catalog",
    description:
      "Explore classic nostalgic games: Hand Cricket, Ludo, Snakes & Ladders, Rummy, UNO, Tambola, Star Game, Dots & Boxes, Name Place Animal Thing, and Retro 90s Arcade hits.",
    ogTitle: "All Games | Bhalyam — 90s Childhood Games Catalog",
    ogDescription:
      "Discover all classic multiplayer & retro games available on Bhalyam. Free, instant room creation, no downloads required.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    canonical: `${BASE_URL}/games`,
  },
  "/about": {
    path: "/about",
    title: "About Bhalyam | Preserving 90s Indian Nostalgia",
    description:
      "Learn why Bhalyam was built: a lightweight, ad-free digital veranda bringing back timeless childhood multiplayer games for school crews and families worldwide.",
    ogTitle: "About Bhalyam | Preserving 90s Indian Nostalgia",
    ogDescription:
      "Built with love for 90s kids. Reconnecting school gangs through nostalgic veranda games.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    canonical: `${BASE_URL}/about`,
  },
  "/privacy": {
    path: "/privacy",
    title: "Privacy Policy | Bhalyam",
    description:
      "Bhalyam's privacy charter under India DPDP Act 2023. Zero tracking, zero ad cookies, privacy-first local storage, and transparent data rights.",
    ogTitle: "Privacy Policy | Bhalyam",
    ogDescription:
      "Privacy-first gaming: zero advertising tracking, minimal local-first data storage, full user data control.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    canonical: `${BASE_URL}/privacy`,
  },
  "/login": {
    path: "/login",
    title: "Sign In | Bhalyam",
    description:
      "Sign in to your Bhalyam account to host persistent multiplayer rooms, customize your avatar, and track your game history.",
    ogTitle: "Sign In | Bhalyam",
    ogDescription:
      "Sign in to your Bhalyam account to unlock persistent room hosting and player profiles.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    canonical: `${BASE_URL}/login`,
  },
  "/signup": {
    path: "/signup",
    title: "Create an Account | Bhalyam",
    description:
      "Join Bhalyam to host custom game rooms, invite your friends, and relive childhood memories with your gang.",
    ogTitle: "Create an Account | Bhalyam",
    ogDescription:
      "Create your free Bhalyam account to host rooms and play timeless games with your friends.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    canonical: `${BASE_URL}/signup`,
  },
  "/forgot-password": {
    path: "/forgot-password",
    title: "Forgot Password | Bhalyam",
    description: "Recover your Bhalyam account password securely via email.",
    ogTitle: "Forgot Password | Bhalyam",
    ogDescription: "Reset your Bhalyam account password.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    canonical: `${BASE_URL}/forgot-password`,
  },
  "/reset-password": {
    path: "/reset-password",
    title: "Reset Password | Bhalyam",
    description: "Set a new secure password for your Bhalyam account.",
    ogTitle: "Reset Password | Bhalyam",
    ogDescription: "Set a new password for your Bhalyam account.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    canonical: `${BASE_URL}/reset-password`,
  },
  "/verify-email": {
    path: "/verify-email",
    title: "Verify Email | Bhalyam",
    description:
      "Enter your 8-digit verification code to activate your Bhalyam member account.",
    ogTitle: "Verify Email | Bhalyam",
    ogDescription: "Verify your email to activate your Bhalyam account.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    canonical: `${BASE_URL}/verify-email`,
  },
  "/nokiacricket": {
    path: "/nokiacricket",
    title: "Nokia Cricket 2D | Classic Brick Nostalgia — Bhalyam",
    description:
      "Play classic 90s Nokia 2D Cricket in your browser. Hit sixes, time your boundaries, and chase legendary high scores.",
    ogTitle: "Nokia Cricket 2D | Classic Brick Nostalgia — Bhalyam",
    ogDescription:
      "Hit sixes and relive 90s Nokia 2D Cricket in retro LCD glory.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    canonical: `${BASE_URL}/nokiacricket`,
  },
  "/snake": {
    path: "/snake",
    title: "Classic Snake | Retro Nokia Arcade — Bhalyam",
    description:
      "Play the timeless classic Nokia Snake game. Guide your snake, eat food, avoid walls, and challenge your personal best score.",
    ogTitle: "Classic Snake | Retro Nokia Arcade — Bhalyam",
    ogDescription:
      "Classic Nokia 3310 Snake game right in your browser. Pure 90s retro arcade nostalgia.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    canonical: `${BASE_URL}/snake`,
  },
  "/brickracer": {
    path: "/brickracer",
    title: "Brick Racer 9999-in-1 | Retro Handheld Racing — Bhalyam",
    description:
      "Dodge cars, switch lanes, and survive high-speed traffic in this authentic 90s brick game racer simulation.",
    ogTitle: "Brick Racer 9999-in-1 | Retro Handheld Racing — Bhalyam",
    ogDescription:
      "Authentic 9999-in-1 handheld brick racing game. Dodge oncoming traffic and rack up high scores.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    canonical: `${BASE_URL}/brickracer`,
  },
  "/brickblocks": {
    path: "/brickblocks",
    title: "Brick Blocks | Classic 9999-in-1 Falling Blocks — Bhalyam",
    description:
      "Stack blocks, clear lines, and test your reflexes in authentic 90s handheld brick console Brick Blocks.",
    ogTitle: "Brick Blocks | Classic 9999-in-1 Falling Blocks — Bhalyam",
    ogDescription:
      "Play classic 90s handheld brick console Brick Blocks. Stack blocks and clear rows.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    canonical: `${BASE_URL}/brickblocks`,
  },
  "/tetris": {
    path: "/tetris",
    title: "Brick Blocks | Classic 9999-in-1 Falling Blocks — Bhalyam",
    description:
      "Stack blocks, clear lines, and test your reflexes in authentic 90s handheld brick console Brick Blocks.",
    ogTitle: "Brick Blocks | Classic 9999-in-1 Falling Blocks — Bhalyam",
    ogDescription:
      "Play classic 90s handheld brick console Brick Blocks. Stack blocks and clear rows.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    canonical: `${BASE_URL}/tetris`,
  },
  "/breakout": {
    path: "/breakout",
    title: "Brick Breakout | Retro Paddle & Ball Arcade — Bhalyam",
    description:
      "Smash bricks and control the bounce with classic LCD handheld physics and sound effects.",
    ogTitle: "Brick Breakout | Retro Paddle & Ball Arcade — Bhalyam",
    ogDescription:
      "Authentic 90s handheld brick breakout arcade. Smash all bricks to win.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    canonical: `${BASE_URL}/breakout`,
  },
};

export const PRERENDER_ROUTES = Object.keys(PUBLIC_ROUTES_METADATA);
