export interface RouteMetadata {
  path: string;
  title: string;
  description: string;
  keywords: string[];
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: string;
  ogSiteName?: string;
  ogLocale?: string;
  ogImageWidth?: string;
  ogImageHeight?: string;
  ogImageType?: string;
  ogImageAlt?: string;
  twitterCard?: string;
  twitterSite?: string;
  twitterCreator?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterImageAlt?: string;
}

export const BASE_URL = "https://bhalyam.onrender.com";
export const DEFAULT_OG_IMAGE = `${BASE_URL}/bhalyam-og-share.jpg`;
export const DEFAULT_OG_WIDTH = "1200";
export const DEFAULT_OG_HEIGHT = "630";
export const DEFAULT_OG_TYPE = "image/jpeg";
export const DEFAULT_OG_ALT = "BHALYAM 90s Indian Childhood Nostalgia Multiplayer Lounge";
export const DEFAULT_SITE_NAME = "BHALYAM · బాల్యం";
export const DEFAULT_LOCALE = "en_US";
export const DEFAULT_TWITTER_CARD = "summary_large_image";
export const DEFAULT_TWITTER_HANDLE = "@bhalyam";

/**
 * Ensures any asset path or relative URL is converted to an absolute HTTPS URL.
 */
export function toAbsoluteUrl(urlOrPath: string): string {
  if (!urlOrPath) return DEFAULT_OG_IMAGE;
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    return urlOrPath;
  }
  const cleanPath = urlOrPath.startsWith("/") ? urlOrPath : `/${urlOrPath}`;
  return `${BASE_URL}${cleanPath}`;
}

const RAW_PUBLIC_ROUTES_METADATA: Record<string, RouteMetadata> = {
  "/": {
    path: "/",
    title: "BHALYAM · బాల్యం — 90s Indian Nostalgic Multiplayer Games Online",
    description:
      "The digital veranda for 90s Telugu & Indian kids. Play Hand Cricket, Ludo, Snakes & Ladders, Rummy, UNO, and nostalgic multiplayer games with friends on your phone.",
    keywords: [
      "bhalyam",
      "balyam",
      "90s indian games",
      "childhood games online",
      "hand cricket online",
      "ludo with friends",
      "indian nostalgia games",
      "free multiplayer games",
      "telugu childhood games",
    ],
    canonical: `${BASE_URL}/`,
    ogTitle: "BHALYAM · బాల్యం — Relive Childhood Nostalgia",
    ogDescription:
      "Relive childhood. Play Hand Cricket, Ludo, Snakes & Ladders, Rummy, UNO, and nostalgic 90s Indian multiplayer games together in your browser.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "BHALYAM · బాల్యం — 90s Indian Nostalgic Multiplayer Games Online",
    twitterDescription:
      "Play Hand Cricket, Ludo, Snakes & Ladders, Rummy, UNO, and retro nostalgia games with your friends online.",
    twitterImage: DEFAULT_OG_IMAGE,
  },
  "/games": {
    path: "/games",
    title: "Play 90s Childhood Games Online | BHALYAM Games Lounge",
    description:
      "Explore classic nostalgic games: Hand Cricket, Ludo, Snakes & Ladders, Rummy, UNO, Tambola, Star Game, Dots & Boxes, Name Place Animal Thing, and Retro 90s Arcade hits.",
    keywords: [
      "classic board games",
      "hand cricket online",
      "ludo online multiplayer",
      "rummy online",
      "uno online with friends",
      "snakes and ladders",
      "dots and boxes game",
      "word building",
      "nokia games online",
      "90s games catalog",
    ],
    canonical: `${BASE_URL}/games`,
    ogTitle: "All 90s Games Catalog | BHALYAM Multiplayer Lounge",
    ogDescription:
      "Discover all classic multiplayer & retro games available on Bhalyam. Free, instant room creation, no downloads required.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Play 90s Childhood Games Online | BHALYAM Games Lounge",
    twitterDescription:
      "Instant multiplayer rooms for Hand Cricket, Ludo, Rummy, UNO, Snakes & Ladders, and retro arcade titles.",
    twitterImage: DEFAULT_OG_IMAGE,
  },
  "/how-to-play": {
    path: "/how-to-play",
    title: "How to Play Indian 90s Games | BHALYAM Rules & Player Guide",
    description:
      "Master classic 90s games. Complete rules and gameplay strategies for Hand Cricket, Ludo, Snakes & Ladders, Rummy, UNO, Dots & Boxes, and Bingo.",
    keywords: [
      "how to play hand cricket",
      "hand cricket rules",
      "ludo official rules",
      "indian rummy rules 13 cards",
      "uno game rules",
      "snakes and ladders guide",
      "dots and boxes strategy",
      "bhalyam game rules",
    ],
    canonical: `${BASE_URL}/how-to-play`,
    ogTitle: "How to Play | Game Rules & Strategy Guides — BHALYAM",
    ogDescription:
      "Complete official rules and winning strategies for nostalgic Indian multiplayer games on Bhalyam.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "article",
    twitterCard: "summary_large_image",
    twitterTitle: "How to Play Indian 90s Games | BHALYAM Rules & Player Guide",
    twitterDescription:
      "Step-by-step instructions and strategy tips for Hand Cricket, Ludo, Rummy, UNO, and classic classroom games.",
    twitterImage: DEFAULT_OG_IMAGE,
  },
  "/support": {
    path: "/support",
    title: "Support & FAQs | BHALYAM Multiplayer Lounge Help Center",
    description:
      "Find answers to frequently asked questions about multiplayer rooms, account management, WebRTC voice chat, turn timers, and platform safety on Bhalyam.",
    keywords: [
      "bhalyam support",
      "bhalyam help",
      "room code troubleshooting",
      "multiplayer disconnect recovery",
      "turn timers explained",
      "webrtc voice chat help",
      "bhalyam faqs",
      "bot players help",
    ],
    canonical: `${BASE_URL}/support`,
    ogTitle: "Support & FAQs | Help Center — BHALYAM",
    ogDescription:
      "Get instant answers for Bhalyam room codes, voice chat, seat recovery, multiplayer gameplay, and player accounts.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Support & FAQs | BHALYAM Multiplayer Lounge Help Center",
    twitterDescription:
      "Browse our comprehensive FAQ directory covering rooms, turn timers, recovery tokens, and safety.",
    twitterImage: DEFAULT_OG_IMAGE,
  },
  "/contact": {
    path: "/contact",
    title: "Contact Us & Helpdesk | BHALYAM Team Support",
    description:
      "Have questions, suggestions, or need assistance? Reach out to the Bhalyam team directly for match investigations, safety reports, and feedback.",
    keywords: [
      "contact bhalyam",
      "bhalyam support email",
      "report player bhalyam",
      "customer support",
      "game feedback",
      "bhalyam helpdesk",
    ],
    canonical: `${BASE_URL}/contact`,
    ogTitle: "Contact Us | Helpdesk & Feedback — BHALYAM",
    ogDescription:
      "Get in touch with the creators of Bhalyam. We respond within 24 hours to help with your inquiries.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Contact Us & Helpdesk | BHALYAM Team Support",
    twitterDescription:
      "Reach our customer support team for assistance with accounts, lounges, or feedback.",
    twitterImage: DEFAULT_OG_IMAGE,
  },
  "/terms": {
    path: "/terms",
    title: "Terms of Service & Lounge Policies | BHALYAM",
    description:
      "Terms and conditions for playing, hosting multiplayer game rooms, and participating in community lounges on the Bhalyam platform.",
    keywords: [
      "bhalyam terms",
      "terms of service",
      "gaming platform terms",
      "multiplayer terms and conditions",
      "lounge rules legal",
    ],
    canonical: `${BASE_URL}/terms`,
    ogTitle: "Terms of Service | BHALYAM",
    ogDescription:
      "Read the terms and conditions for using Bhalyam's digital veranda gaming platform.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Terms of Service & Lounge Policies | BHALYAM",
    twitterDescription:
      "User agreements, fair play terms, and platform guidelines for Bhalyam multiplayer lounges.",
    twitterImage: DEFAULT_OG_IMAGE,
  },
  "/privacy": {
    path: "/privacy",
    title: "Privacy Policy & Data Rights | BHALYAM DPDP Charter",
    description:
      "Bhalyam's privacy charter under India DPDP Act 2023. Zero tracking, zero ad cookies, privacy-first local storage, and transparent data rights.",
    keywords: [
      "bhalyam privacy",
      "privacy policy",
      "india dpdp act 2023",
      "data privacy gaming",
      "zero tracking policy",
      "seat token security",
    ],
    canonical: `${BASE_URL}/privacy`,
    ogTitle: "Privacy Policy | BHALYAM",
    ogDescription:
      "Privacy-first gaming: zero advertising tracking, minimal local-first data storage, full user data control.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Privacy Policy & Data Rights | BHALYAM DPDP Charter",
    twitterDescription:
      "Our promise: zero advertising cookies, no data selling, and peer-to-peer encrypted voice calling.",
    twitterImage: DEFAULT_OG_IMAGE,
  },
  "/safety": {
    path: "/safety",
    title: "Safety Center & Fair Play Charter | BHALYAM Community Protection",
    description:
      "Our commitment to fair play, safety, anti-cheat mechanisms, and respectful multiplayer environments for players of all ages.",
    keywords: [
      "bhalyam safety",
      "fair play charter",
      "community safety",
      "anti cheat gaming",
      "safe gaming for kids",
      "player reporting",
    ],
    canonical: `${BASE_URL}/safety`,
    ogTitle: "Safety Center & Fair Play Charter | BHALYAM",
    ogDescription:
      "Learn about Bhalyam's community safety policies, anti-harassment controls, and fair play standards.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Safety Center & Fair Play Charter | BHALYAM Community Protection",
    twitterDescription:
      "Explore how BHALYAM protects player privacy, moderates abusive conduct, and enforces server-authoritative fair play.",
    twitterImage: DEFAULT_OG_IMAGE,
  },
  "/community-rules": {
    path: "/community-rules",
    title: "Community Rules & Lounge Etiquette | BHALYAM Code of Conduct",
    description:
      "Guidelines and code of conduct for friendly, respectful multiplayer lounge games with friends and family on Bhalyam.",
    keywords: [
      "community rules",
      "lounge etiquette",
      "code of conduct",
      "gaming rules of behavior",
      "respectful multiplayer",
      "sportsmanship",
    ],
    canonical: `${BASE_URL}/community-rules`,
    ogTitle: "Community Rules & Lounge Etiquette | BHALYAM",
    ogDescription:
      "Lounge rules and code of conduct for respectful multiplayer games on Bhalyam.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Community Rules & Lounge Etiquette | BHALYAM Code of Conduct",
    twitterDescription:
      "Standards of fair play, communication etiquette, and positive community interactions in BHALYAM lounges.",
    twitterImage: DEFAULT_OG_IMAGE,
  },
  "/leaderboard": {
    path: "/leaderboard",
    title: "Global Leaderboards & Hall of Fame | BHALYAM Champions",
    description:
      "Track top players, win streaks, and highest ranked champions across Hand Cricket, Ludo, Rummy, and retro games on Bhalyam.",
    keywords: [
      "bhalyam leaderboard",
      "top players",
      "hand cricket high score",
      "ludo win streak",
      "gaming rankings",
      "nostalgia champions",
    ],
    canonical: `${BASE_URL}/leaderboard`,
    ogTitle: "Global Leaderboards | Top Champions — BHALYAM",
    ogDescription:
      "Discover the top nostalgic game champions, highest XP earners, and winning streaks on Bhalyam.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Global Leaderboards & Hall of Fame | BHALYAM Champions",
    twitterDescription:
      "Check out real-time player rankings, global leaderboards, and seasonal champion ladders.",
    twitterImage: DEFAULT_OG_IMAGE,
  },
  "/tournaments": {
    path: "/tournaments",
    title: "Multiplayer Tournaments & Nostalgia Cups | BHALYAM Events",
    description:
      "Join competitive multiplayer tournaments, weekend nostalgia cups, and special showdowns on Bhalyam.",
    keywords: [
      "online tournaments",
      "gaming tournaments",
      "hand cricket tournament",
      "ludo cup",
      "multiplayer championships",
      "esports nostalgia",
    ],
    canonical: `${BASE_URL}/tournaments`,
    ogTitle: "Tournaments & Events | BHALYAM",
    ogDescription:
      "Compete in exciting multiplayer tournaments and win prestigious profile badges on Bhalyam.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Multiplayer Tournaments & Nostalgia Cups | BHALYAM Events",
    twitterDescription:
      "Participate in community brackets, school-gang tournaments, and championship finals.",
    twitterImage: DEFAULT_OG_IMAGE,
  },
  "/social": {
    path: "/social",
    title: "Social Hub & Squad Lobby | Connect with Friends — BHALYAM",
    description:
      "See online friends, send room invites, and reconnect with your childhood gang on Bhalyam.",
    keywords: [
      "gaming social hub",
      "play with friends",
      "room invite",
      "childhood gang gaming",
      "online presence",
      "multiplayer squad",
    ],
    canonical: `${BASE_URL}/social`,
    ogTitle: "Social Hub | Friends & Presence — BHALYAM",
    ogDescription:
      "Connect with friends, check online presence, and jump into multiplayer game rooms together.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Social Hub & Squad Lobby | Connect with Friends — BHALYAM",
    twitterDescription:
      "Form squads, invite friends with one click, and relive the veranda gaming tradition.",
    twitterImage: DEFAULT_OG_IMAGE,
  },
  "/about": {
    path: "/about",
    title: "About BHALYAM | The Story Behind India's 90s Digital Veranda",
    description:
      "Learn why Bhalyam was built: a lightweight, ad-free digital veranda bringing back timeless childhood multiplayer games for school crews and families worldwide.",
    keywords: [
      "about bhalyam",
      "kethan kumar gontla",
      "90s nostalgia veranda",
      "indian childhood games story",
      "why bhalyam was built",
      "nostalgic gaming platform",
    ],
    canonical: `${BASE_URL}/about`,
    ogTitle: "About Bhalyam | Preserving 90s Indian Nostalgia",
    ogDescription:
      "Built with love for 90s kids. Reconnecting school gangs through nostalgic veranda games.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "About BHALYAM | The Story Behind India's 90s Digital Veranda",
    twitterDescription:
      "The vision, core tenets, and cultural mission behind BHALYAM's nostalgic gaming platform.",
    twitterImage: DEFAULT_OG_IMAGE,
  },
  "/favorites": {
    path: "/favorites",
    title: "Your Favorite Games | BHALYAM Quick Access Lounge",
    description:
      "Quick access to your pinned and favorite childhood nostalgic games on Bhalyam for rapid room creation.",
    keywords: [
      "favorite games",
      "pinned games",
      "quick play lounge",
      "bhalyam favorites",
      "fast game launch",
    ],
    canonical: `${BASE_URL}/favorites`,
    ogTitle: "Favorite Games | BHALYAM",
    ogDescription:
      "Quickly launch and host your hand-picked favorite childhood games on Bhalyam.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Your Favorite Games | BHALYAM Quick Access Lounge",
    twitterDescription:
      "Keep your most loved 90s games pinned at the top for instant multiplayer fun.",
    twitterImage: DEFAULT_OG_IMAGE,
  },
  "/recently-played": {
    path: "/recently-played",
    title: "Recently Played Matches & History | BHALYAM",
    description:
      "Jump back into your recently played multiplayer lounges and retro arcade matches on Bhalyam.",
    keywords: [
      "recently played games",
      "game history",
      "resume match",
      "recent lounges",
      "match continuation",
    ],
    canonical: `${BASE_URL}/recently-played`,
    ogTitle: "Recently Played Games | BHALYAM",
    ogDescription:
      "Resume your recently played games and rejoin active lounges on Bhalyam.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Recently Played Matches & History | BHALYAM",
    twitterDescription:
      "View your latest match activity, room codes, and jump back into ongoing games.",
    twitterImage: DEFAULT_OG_IMAGE,
  },
  "/login": {
    path: "/login",
    title: "Sign In to BHALYAM | Access Your Lounges & Member Stats",
    description:
      "Sign in to your Bhalyam account to host persistent multiplayer rooms, customize your avatar, and track your lifetime game history.",
    keywords: [
      "bhalyam sign in",
      "member login",
      "access account",
      "host rooms login",
      "player profile login",
    ],
    canonical: `${BASE_URL}/login`,
    ogTitle: "Sign In | BHALYAM",
    ogDescription:
      "Sign in to your Bhalyam account to unlock persistent room hosting and player profiles.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Sign In to BHALYAM | Access Your Lounges & Member Stats",
    twitterDescription:
      "Log in to host custom rooms, track achievements, and customize your retro avatar.",
    twitterImage: DEFAULT_OG_IMAGE,
  },
  "/signup": {
    path: "/signup",
    title: "Create Free Account | Host Rooms & Track XP — BHALYAM",
    description:
      "Join Bhalyam to host custom game rooms, invite your friends, unlock competitive achievements, and relive childhood memories with your gang.",
    keywords: [
      "create bhalyam account",
      "sign up free",
      "member registration",
      "join bhalyam",
      "host game rooms",
    ],
    canonical: `${BASE_URL}/signup`,
    ogTitle: "Create an Account | BHALYAM",
    ogDescription:
      "Create your free Bhalyam account to host rooms and play timeless games with your friends.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Create Free Account | Host Rooms & Track XP — BHALYAM",
    twitterDescription:
      "Sign up in seconds to start hosting rooms and tracking your nostalgic gaming journey.",
    twitterImage: DEFAULT_OG_IMAGE,
  },
  "/forgot-password": {
    path: "/forgot-password",
    title: "Forgot Password | Reset Account Access — BHALYAM",
    description:
      "Recover your Bhalyam account password securely via email verification code.",
    keywords: [
      "forgot password",
      "reset password bhalyam",
      "recover account",
      "password recovery",
    ],
    canonical: `${BASE_URL}/forgot-password`,
    ogTitle: "Forgot Password | BHALYAM",
    ogDescription: "Reset your Bhalyam account password securely via email.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Forgot Password | Reset Account Access — BHALYAM",
    twitterDescription: "Recover your Bhalyam account credentials securely.",
    twitterImage: DEFAULT_OG_IMAGE,
  },
  "/reset-password": {
    path: "/reset-password",
    title: "Set New Password | Secure Account Recovery — BHALYAM",
    description:
      "Set a new secure password for your Bhalyam account and resume your gaming sessions.",
    keywords: [
      "set new password",
      "password reset",
      "secure account bhalyam",
      "update password",
    ],
    canonical: `${BASE_URL}/reset-password`,
    ogTitle: "Reset Password | BHALYAM",
    ogDescription: "Set a new secure password for your Bhalyam account.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Set New Password | Secure Account Recovery — BHALYAM",
    twitterDescription: "Confirm your new password to regain full access to your Bhalyam lounges.",
    twitterImage: DEFAULT_OG_IMAGE,
  },
  "/verify-email": {
    path: "/verify-email",
    title: "Verify Email Address | Complete Member Setup — BHALYAM",
    description:
      "Enter your 8-digit verification code to activate your Bhalyam member account and unlock room hosting.",
    keywords: [
      "verify email",
      "activation code",
      "member verification bhalyam",
      "email confirm",
    ],
    canonical: `${BASE_URL}/verify-email`,
    ogTitle: "Verify Email | BHALYAM",
    ogDescription: "Verify your email to activate your Bhalyam member account.",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: "Verify Email Address | Complete Member Setup — BHALYAM",
    twitterDescription: "Finalize your account verification to start playing and hosting.",
    twitterImage: DEFAULT_OG_IMAGE,
  },
  "/nokiacricket": {
    path: "/nokiacricket",
    title: "Nokia Cricket 2D | Classic 90s Mobile Brick Cricket — BHALYAM",
    description:
      "Play classic 90s Nokia 2D Cricket in your browser. Hit sixes, time your boundaries, and chase legendary high scores in retro LCD monochrome glory.",
    keywords: [
      "nokia cricket",
      "classic cricket 2d",
      "retro mobile cricket",
      "90s nokia game",
      "play nokia cricket online",
      "monochrome cricket",
    ],
    canonical: `${BASE_URL}/nokiacricket`,
    ogTitle: "Nokia Cricket 2D | Classic Brick Nostalgia — BHALYAM",
    ogDescription:
      "Hit sixes and relive 90s Nokia 2D Cricket in authentic retro LCD glory.",
    ogImage: `${BASE_URL}/og/nokiacricket.jpg`,
    ogImageWidth: "800",
    ogImageHeight: "787",
    ogImageType: "image/jpeg",
    ogImageAlt: "Nokia Cricket 2D Retro Handheld Game",
    ogSiteName: DEFAULT_SITE_NAME,
    ogLocale: DEFAULT_LOCALE,
    ogType: "game",
    twitterCard: "summary_large_image",
    twitterSite: DEFAULT_TWITTER_HANDLE,
    twitterCreator: DEFAULT_TWITTER_HANDLE,
    twitterTitle: "Nokia Cricket 2D | Classic 90s Mobile Brick Cricket — BHALYAM",
    twitterDescription:
      "Play the legendary 90s phone cricket game in your browser with authentic controls and physics.",
    twitterImage: `${BASE_URL}/og/nokiacricket.jpg`,
    twitterImageAlt: "Nokia Cricket 2D Retro Handheld Game",
  },
  "/snake": {
    path: "/snake",
    title: "Classic Nokia Snake | Original 90s 3310 Arcade — BHALYAM",
    description:
      "Play the timeless classic Nokia Snake game. Guide your snake, eat food, avoid walls, and challenge your personal best score.",
    keywords: [
      "nokia snake",
      "snake 3310",
      "classic snake game",
      "play snake online",
      "retro arcade snake",
      "90s snake game",
    ],
    canonical: `${BASE_URL}/snake`,
    ogTitle: "Classic Snake | Retro Nokia Arcade — BHALYAM",
    ogDescription:
      "Classic Nokia 3310 Snake game right in your browser. Pure 90s retro arcade nostalgia.",
    ogImage: `${BASE_URL}/og/snake.jpg`,
    ogImageWidth: "800",
    ogImageHeight: "533",
    ogImageType: "image/jpeg",
    ogImageAlt: "Classic Nokia 3310 Snake Arcade Game",
    ogSiteName: DEFAULT_SITE_NAME,
    ogLocale: DEFAULT_LOCALE,
    ogType: "game",
    twitterCard: "summary_large_image",
    twitterSite: DEFAULT_TWITTER_HANDLE,
    twitterCreator: DEFAULT_TWITTER_HANDLE,
    twitterTitle: "Classic Nokia Snake | Original 90s 3310 Arcade — BHALYAM",
    twitterDescription:
      "Guide the snake and relive the most popular phone game in history right on your device.",
    twitterImage: `${BASE_URL}/og/snake.jpg`,
    twitterImageAlt: "Classic Nokia 3310 Snake Arcade Game",
  },
  "/brickracer": {
    path: "/brickracer",
    title: "Brick Racer 9999-in-1 | Authentic Handheld Car Racing — BHALYAM",
    description:
      "Dodge oncoming cars, switch lanes, and survive intense high-speed traffic in this authentic 90s handheld 9999-in-1 brick game racer simulation.",
    keywords: [
      "brick racer",
      "9999 in 1 racing",
      "handheld brick game",
      "retro car racing",
      "brick console game",
      "classic lane racer",
    ],
    canonical: `${BASE_URL}/brickracer`,
    ogTitle: "Brick Racer 9999-in-1 | Retro Handheld Racing — BHALYAM",
    ogDescription:
      "Authentic 9999-in-1 handheld brick racing game. Dodge oncoming traffic and rack up high scores.",
    ogImage: `${BASE_URL}/og/brickracer.jpg`,
    ogImageWidth: "800",
    ogImageHeight: "750",
    ogImageType: "image/jpeg",
    ogImageAlt: "Brick Racer 9999-in-1 Retro Handheld Console Game",
    ogSiteName: DEFAULT_SITE_NAME,
    ogLocale: DEFAULT_LOCALE,
    ogType: "game",
    twitterCard: "summary_large_image",
    twitterSite: DEFAULT_TWITTER_HANDLE,
    twitterCreator: DEFAULT_TWITTER_HANDLE,
    twitterTitle: "Brick Racer 9999-in-1 | Authentic Handheld Car Racing — BHALYAM",
    twitterDescription:
      "Dodge traffic, accelerate through obstacles, and master the 90s handheld racing legend.",
    twitterImage: `${BASE_URL}/og/brickracer.jpg`,
    twitterImageAlt: "Brick Racer 9999-in-1 Retro Handheld Console Game",
  },
  "/brickblocks": {
    path: "/brickblocks",
    title: "Brick Blocks 9999-in-1 | Retro Handheld Falling Blocks — BHALYAM",
    description:
      "Stack blocks, clear lines, and test your reflexes in authentic 90s handheld 9999-in-1 brick game console simulation.",
    keywords: [
      "brick blocks",
      "9999 in 1 brick game",
      "handheld brick puzzle",
      "falling blocks brick game",
      "retro block stacker",
    ],
    canonical: `${BASE_URL}/brickblocks`,
    ogTitle: "Brick Blocks 9999-in-1 | Retro Handheld Falling Blocks — BHALYAM",
    ogDescription:
      "Play classic 90s handheld brick console Brick Blocks. Stack falling shapes and clear rows.",
    ogImage: `${BASE_URL}/og/brickblocks.jpg`,
    ogImageWidth: "800",
    ogImageHeight: "800",
    ogImageType: "image/jpeg",
    ogImageAlt: "Brick Blocks 9999-in-1 Handheld Falling Blocks Puzzle",
    ogSiteName: DEFAULT_SITE_NAME,
    ogLocale: DEFAULT_LOCALE,
    ogType: "game",
    twitterCard: "summary_large_image",
    twitterSite: DEFAULT_TWITTER_HANDLE,
    twitterCreator: DEFAULT_TWITTER_HANDLE,
    twitterTitle: "Brick Blocks 9999-in-1 | Retro Handheld Falling Blocks — BHALYAM",
    twitterDescription:
      "Stack falling blocks and clear rows in authentic 90s handheld LCD arcade style.",
    twitterImage: `${BASE_URL}/og/brickblocks.jpg`,
    twitterImageAlt: "Brick Blocks 9999-in-1 Handheld Falling Blocks Puzzle",
  },
  "/tetris": {
    path: "/tetris",
    title: "Classic Tetris 90s | Retro Handheld Brick Puzzle — BHALYAM",
    description:
      "Play classic Tetris inspired by 90s brick game consoles. Rotate tetrominoes, complete lines, and survive increasing drop speeds.",
    keywords: [
      "classic tetris",
      "90s tetris",
      "retro falling blocks",
      "brick game tetris",
      "play tetris online",
      "tetromino puzzle",
    ],
    canonical: `${BASE_URL}/tetris`,
    ogTitle: "Classic Tetris 90s | Retro Handheld Brick Puzzle — BHALYAM",
    ogDescription:
      "Rotate tetrominoes and clear lines in nostalgic 90s handheld brick puzzle glory.",
    ogImage: `${BASE_URL}/og/tetris.jpg`,
    ogImageWidth: "800",
    ogImageHeight: "800",
    ogImageType: "image/jpeg",
    ogImageAlt: "Classic Tetris 90s Retro Handheld Puzzle Game",
    ogSiteName: DEFAULT_SITE_NAME,
    ogLocale: DEFAULT_LOCALE,
    ogType: "game",
    twitterCard: "summary_large_image",
    twitterSite: DEFAULT_TWITTER_HANDLE,
    twitterCreator: DEFAULT_TWITTER_HANDLE,
    twitterTitle: "Classic Tetris 90s | Retro Handheld Brick Puzzle — BHALYAM",
    twitterDescription:
      "The world's favorite block puzzle game recreated with authentic 90s handheld sounds and mechanics.",
    twitterImage: `${BASE_URL}/og/tetris.jpg`,
    twitterImageAlt: "Classic Tetris 90s Retro Handheld Puzzle Game",
  },
  "/breakout": {
    path: "/breakout",
    title: "Brick Breakout | Retro Paddle & Ball LCD Arcade — BHALYAM",
    description:
      "Smash bricks, deflect high-speed balls, and control the bounce with authentic 90s handheld brick game paddle mechanics.",
    keywords: [
      "brick breakout",
      "paddle and ball",
      "9999 in 1 breakout",
      "retro brick breaker",
      "handheld arcade",
      "lcd breakout",
    ],
    canonical: `${BASE_URL}/breakout`,
    ogTitle: "Brick Breakout | Retro Paddle & Ball Arcade — BHALYAM",
    ogDescription:
      "Authentic 90s handheld brick breakout arcade. Smash all bricks to win.",
    ogImage: `${BASE_URL}/og/breakout.jpg`,
    ogImageWidth: "774",
    ogImageHeight: "800",
    ogImageType: "image/jpeg",
    ogImageAlt: "Brick Breakout Paddle and Ball LCD Arcade Game",
    ogSiteName: DEFAULT_SITE_NAME,
    ogLocale: DEFAULT_LOCALE,
    ogType: "game",
    twitterCard: "summary_large_image",
    twitterSite: DEFAULT_TWITTER_HANDLE,
    twitterCreator: DEFAULT_TWITTER_HANDLE,
    twitterTitle: "Brick Breakout | Retro Paddle & Ball LCD Arcade — BHALYAM",
    twitterDescription:
      "Bounce the ball, break through brick walls, and challenge high-score limits.",
    twitterImage: `${BASE_URL}/og/breakout.jpg`,
    twitterImageAlt: "Brick Breakout Paddle and Ball LCD Arcade Game",
  },
  "/design-system": {
    path: "/design-system",
    title: "BHALYAM Design System | DLS Tokens & UI Architecture",
    description:
      "Explore BHALYAM's design token architecture, tactile gaming palettes, accessible components, and WCAG AA interactive patterns.",
    keywords: [
      "bhalyam design system",
      "dls tokens",
      "ui architecture",
      "gaming component library",
      "design tokens react",
    ],
    canonical: `${BASE_URL}/design-system`,
    ogTitle: "Design System Catalog | BHALYAM",
    ogDescription:
      "Interactive showcase of BHALYAM design system tokens, buttons, modals, and gaming UI elements.",
    ogImage: DEFAULT_OG_IMAGE,
    ogImageWidth: DEFAULT_OG_WIDTH,
    ogImageHeight: DEFAULT_OG_HEIGHT,
    ogImageType: DEFAULT_OG_TYPE,
    ogImageAlt: "BHALYAM Design System Tokens and Components",
    ogSiteName: DEFAULT_SITE_NAME,
    ogLocale: DEFAULT_LOCALE,
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterSite: DEFAULT_TWITTER_HANDLE,
    twitterCreator: DEFAULT_TWITTER_HANDLE,
    twitterTitle: "BHALYAM Design System | DLS Tokens & UI Architecture",
    twitterDescription:
      "Design tokens, accessible component primitives, and nostalgic styling for the BHALYAM platform.",
    twitterImage: DEFAULT_OG_IMAGE,
    twitterImageAlt: "BHALYAM Design System Tokens and Components",
  },

  // Aliases for retro handheld titles
  "/cricket2d": {
    path: "/cricket2d",
    canonical: `${BASE_URL}/nokiacricket`,
    title: "Nokia Cricket 2D | Classic 90s Mobile Brick Cricket — BHALYAM",
    description:
      "Play classic 90s Nokia 2D Cricket in your browser. Hit sixes, time your boundaries, and chase legendary high scores in retro LCD monochrome glory.",
    keywords: ["cricket 2d", "nokia cricket", "90s mobile cricket"],
    ogTitle: "Nokia Cricket 2D | Classic Brick Nostalgia — BHALYAM",
    ogDescription: "Hit sixes and relive 90s Nokia 2D Cricket in authentic retro LCD glory.",
    ogImage: `${BASE_URL}/og/nokiacricket.jpg`,
    ogImageWidth: "800",
    ogImageHeight: "787",
    ogImageType: "image/jpeg",
    ogImageAlt: "Nokia Cricket 2D Retro Handheld Game",
    ogSiteName: DEFAULT_SITE_NAME,
    ogLocale: DEFAULT_LOCALE,
    ogType: "game",
    twitterCard: "summary_large_image",
    twitterSite: DEFAULT_TWITTER_HANDLE,
    twitterCreator: DEFAULT_TWITTER_HANDLE,
    twitterTitle: "Nokia Cricket 2D | Classic 90s Mobile Brick Cricket — BHALYAM",
    twitterDescription: "Play the legendary 90s phone cricket game in your browser.",
    twitterImage: `${BASE_URL}/og/nokiacricket.jpg`,
    twitterImageAlt: "Nokia Cricket 2D Retro Handheld Game",
  },
  "/nokiasnake": {
    path: "/nokiasnake",
    canonical: `${BASE_URL}/snake`,
    title: "Classic Nokia Snake | Original 90s 3310 Arcade — BHALYAM",
    description:
      "Play the timeless classic Nokia Snake game. Guide your snake, eat food, avoid walls, and challenge your personal best score.",
    keywords: ["nokia snake", "snake 3310", "play snake online"],
    ogTitle: "Classic Snake | Retro Nokia Arcade — BHALYAM",
    ogDescription: "Classic Nokia 3310 Snake game right in your browser. Pure 90s retro arcade nostalgia.",
    ogImage: `${BASE_URL}/og/snake.jpg`,
    ogImageWidth: "800",
    ogImageHeight: "533",
    ogImageType: "image/jpeg",
    ogImageAlt: "Classic Nokia 3310 Snake Arcade Game",
    ogSiteName: DEFAULT_SITE_NAME,
    ogLocale: DEFAULT_LOCALE,
    ogType: "game",
    twitterCard: "summary_large_image",
    twitterSite: DEFAULT_TWITTER_HANDLE,
    twitterCreator: DEFAULT_TWITTER_HANDLE,
    twitterTitle: "Classic Nokia Snake | Original 90s 3310 Arcade — BHALYAM",
    twitterDescription: "Classic Nokia 3310 Snake game right in your browser.",
    twitterImage: `${BASE_URL}/og/snake.jpg`,
    twitterImageAlt: "Classic Nokia 3310 Snake Arcade Game",
  },
  "/snake2d": {
    path: "/snake2d",
    canonical: `${BASE_URL}/snake`,
    title: "Classic Nokia Snake | Original 90s 3310 Arcade — BHALYAM",
    description:
      "Play the timeless classic Nokia Snake game. Guide your snake, eat food, avoid walls, and challenge your personal best score.",
    keywords: ["snake 2d", "classic snake", "retro snake"],
    ogTitle: "Classic Snake | Retro Nokia Arcade — BHALYAM",
    ogDescription: "Classic Nokia 3310 Snake game right in your browser. Pure 90s retro arcade nostalgia.",
    ogImage: `${BASE_URL}/og/snake.jpg`,
    ogImageWidth: "800",
    ogImageHeight: "533",
    ogImageType: "image/jpeg",
    ogImageAlt: "Classic Nokia 3310 Snake Arcade Game",
    ogSiteName: DEFAULT_SITE_NAME,
    ogLocale: DEFAULT_LOCALE,
    ogType: "game",
    twitterCard: "summary_large_image",
    twitterSite: DEFAULT_TWITTER_HANDLE,
    twitterCreator: DEFAULT_TWITTER_HANDLE,
    twitterTitle: "Classic Nokia Snake | Original 90s 3310 Arcade — BHALYAM",
    twitterDescription: "Classic Nokia 3310 Snake game right in your browser.",
    twitterImage: `${BASE_URL}/og/snake.jpg`,
    twitterImageAlt: "Classic Nokia 3310 Snake Arcade Game",
  },
  "/roadrash": {
    path: "/roadrash",
    canonical: `${BASE_URL}/brickracer`,
    title: "Brick Racer 9999-in-1 | Authentic Handheld Car Racing — BHALYAM",
    description:
      "Dodge oncoming cars, switch lanes, and survive intense high-speed traffic in this authentic 90s handheld 9999-in-1 brick game racer simulation.",
    keywords: ["road rash 90s", "brick racer", "retro racing"],
    ogTitle: "Brick Racer 9999-in-1 | Retro Handheld Racing — BHALYAM",
    ogDescription: "Authentic 9999-in-1 handheld brick racing game. Dodge oncoming traffic and rack up high scores.",
    ogImage: `${BASE_URL}/og/brickracer.jpg`,
    ogImageWidth: "800",
    ogImageHeight: "750",
    ogImageType: "image/jpeg",
    ogImageAlt: "Brick Racer 9999-in-1 Retro Handheld Console Game",
    ogSiteName: DEFAULT_SITE_NAME,
    ogLocale: DEFAULT_LOCALE,
    ogType: "game",
    twitterCard: "summary_large_image",
    twitterSite: DEFAULT_TWITTER_HANDLE,
    twitterCreator: DEFAULT_TWITTER_HANDLE,
    twitterTitle: "Brick Racer 9999-in-1 | Authentic Handheld Car Racing — BHALYAM",
    twitterDescription: "Dodge oncoming traffic and rack up high scores.",
    twitterImage: `${BASE_URL}/og/brickracer.jpg`,
    twitterImageAlt: "Brick Racer 9999-in-1 Retro Handheld Console Game",
  },
  "/racer": {
    path: "/racer",
    canonical: `${BASE_URL}/brickracer`,
    title: "Brick Racer 9999-in-1 | Authentic Handheld Car Racing — BHALYAM",
    description:
      "Dodge oncoming cars, switch lanes, and survive intense high-speed traffic in this authentic 90s handheld 9999-in-1 brick game racer simulation.",
    keywords: ["racer", "brick racer", "retro lane racer"],
    ogTitle: "Brick Racer 9999-in-1 | Retro Handheld Racing — BHALYAM",
    ogDescription: "Authentic 9999-in-1 handheld brick racing game. Dodge oncoming traffic and rack up high scores.",
    ogImage: `${BASE_URL}/og/brickracer.jpg`,
    ogImageWidth: "800",
    ogImageHeight: "750",
    ogImageType: "image/jpeg",
    ogImageAlt: "Brick Racer 9999-in-1 Retro Handheld Console Game",
    ogSiteName: DEFAULT_SITE_NAME,
    ogLocale: DEFAULT_LOCALE,
    ogType: "game",
    twitterCard: "summary_large_image",
    twitterSite: DEFAULT_TWITTER_HANDLE,
    twitterCreator: DEFAULT_TWITTER_HANDLE,
    twitterTitle: "Brick Racer 9999-in-1 | Authentic Handheld Car Racing — BHALYAM",
    twitterDescription: "Dodge oncoming traffic and rack up high scores.",
    twitterImage: `${BASE_URL}/og/brickracer.jpg`,
    twitterImageAlt: "Brick Racer 9999-in-1 Retro Handheld Console Game",
  },
  "/bricktetris": {
    path: "/bricktetris",
    canonical: `${BASE_URL}/tetris`,
    title: "Classic Tetris 90s | Retro Handheld Brick Puzzle — BHALYAM",
    description:
      "Play classic Tetris inspired by 90s brick game consoles. Rotate tetrominoes, complete lines, and survive increasing drop speeds.",
    keywords: ["brick tetris", "retro tetris", "handheld puzzle"],
    ogTitle: "Classic Tetris 90s | Retro Handheld Brick Puzzle — BHALYAM",
    ogDescription: "Rotate tetrominoes and clear lines in nostalgic 90s handheld brick puzzle glory.",
    ogImage: `${BASE_URL}/og/tetris.jpg`,
    ogImageWidth: "800",
    ogImageHeight: "800",
    ogImageType: "image/jpeg",
    ogImageAlt: "Classic Tetris 90s Retro Handheld Puzzle Game",
    ogSiteName: DEFAULT_SITE_NAME,
    ogLocale: DEFAULT_LOCALE,
    ogType: "game",
    twitterCard: "summary_large_image",
    twitterSite: DEFAULT_TWITTER_HANDLE,
    twitterCreator: DEFAULT_TWITTER_HANDLE,
    twitterTitle: "Classic Tetris 90s | Retro Handheld Brick Puzzle — BHALYAM",
    twitterDescription: "Rotate tetrominoes and clear lines in nostalgic 90s handheld brick puzzle glory.",
    twitterImage: `${BASE_URL}/og/tetris.jpg`,
    twitterImageAlt: "Classic Tetris 90s Retro Handheld Puzzle Game",
  },
  "/pentix": {
    path: "/pentix",
    canonical: `${BASE_URL}/brickblocks`,
    title: "Brick Blocks 9999-in-1 | Retro Handheld Falling Blocks — BHALYAM",
    description:
      "Stack blocks, clear lines, and test your reflexes in authentic 90s handheld 9999-in-1 brick game console simulation.",
    keywords: ["pentix", "brick blocks", "retro blocks puzzle"],
    ogTitle: "Brick Blocks 9999-in-1 | Retro Handheld Falling Blocks — BHALYAM",
    ogDescription: "Play classic 90s handheld brick console Brick Blocks. Stack falling shapes and clear rows.",
    ogImage: `${BASE_URL}/og/brickblocks.jpg`,
    ogImageWidth: "800",
    ogImageHeight: "800",
    ogImageType: "image/jpeg",
    ogImageAlt: "Brick Blocks 9999-in-1 Handheld Falling Blocks Puzzle",
    ogSiteName: DEFAULT_SITE_NAME,
    ogLocale: DEFAULT_LOCALE,
    ogType: "game",
    twitterCard: "summary_large_image",
    twitterSite: DEFAULT_TWITTER_HANDLE,
    twitterCreator: DEFAULT_TWITTER_HANDLE,
    twitterTitle: "Brick Blocks 9999-in-1 | Retro Handheld Falling Blocks — BHALYAM",
    twitterDescription: "Play classic 90s handheld brick console Brick Blocks.",
    twitterImage: `${BASE_URL}/og/brickblocks.jpg`,
    twitterImageAlt: "Brick Blocks 9999-in-1 Handheld Falling Blocks Puzzle",
  },
  "/brickbreakout": {
    path: "/brickbreakout",
    canonical: `${BASE_URL}/breakout`,
    title: "Brick Breakout | Retro Paddle & Ball LCD Arcade — BHALYAM",
    description:
      "Smash bricks, deflect high-speed balls, and control the bounce with authentic 90s handheld brick game paddle mechanics.",
    keywords: ["brick breakout", "paddle ball", "retro breakout"],
    ogTitle: "Brick Breakout | Retro Paddle & Ball Arcade — BHALYAM",
    ogDescription: "Authentic 90s handheld brick breakout arcade. Smash all bricks to win.",
    ogImage: `${BASE_URL}/og/breakout.jpg`,
    ogImageWidth: "774",
    ogImageHeight: "800",
    ogImageType: "image/jpeg",
    ogImageAlt: "Brick Breakout Paddle and Ball LCD Arcade Game",
    ogSiteName: DEFAULT_SITE_NAME,
    ogLocale: DEFAULT_LOCALE,
    ogType: "game",
    twitterCard: "summary_large_image",
    twitterSite: DEFAULT_TWITTER_HANDLE,
    twitterCreator: DEFAULT_TWITTER_HANDLE,
    twitterTitle: "Brick Breakout | Retro Paddle & Ball LCD Arcade — BHALYAM",
    twitterDescription: "Authentic 90s handheld brick breakout arcade. Smash all bricks to win.",
    twitterImage: `${BASE_URL}/og/breakout.jpg`,
    twitterImageAlt: "Brick Breakout Paddle and Ball LCD Arcade Game",
  },
  "/brick-breakout": {
    path: "/brick-breakout",
    canonical: `${BASE_URL}/breakout`,
    title: "Brick Breakout | Retro Paddle & Ball LCD Arcade — BHALYAM",
    description:
      "Smash bricks, deflect high-speed balls, and control the bounce with authentic 90s handheld brick game paddle mechanics.",
    keywords: ["brick breakout", "paddle and ball", "lcd breakout"],
    ogTitle: "Brick Breakout | Retro Paddle & Ball Arcade — BHALYAM",
    ogDescription: "Authentic 90s handheld brick breakout arcade. Smash all bricks to win.",
    ogImage: `${BASE_URL}/og/breakout.jpg`,
    ogImageWidth: "774",
    ogImageHeight: "800",
    ogImageType: "image/jpeg",
    ogImageAlt: "Brick Breakout Paddle and Ball LCD Arcade Game",
    ogSiteName: DEFAULT_SITE_NAME,
    ogLocale: DEFAULT_LOCALE,
    ogType: "game",
    twitterCard: "summary_large_image",
    twitterSite: DEFAULT_TWITTER_HANDLE,
    twitterCreator: DEFAULT_TWITTER_HANDLE,
    twitterTitle: "Brick Breakout | Retro Paddle & Ball LCD Arcade — BHALYAM",
    twitterDescription: "Authentic 90s handheld brick breakout arcade. Smash all bricks to win.",
    twitterImage: `${BASE_URL}/og/breakout.jpg`,
    twitterImageAlt: "Brick Breakout Paddle and Ball LCD Arcade Game",
  },
  "/blockbreakout": {
    path: "/blockbreakout",
    canonical: `${BASE_URL}/breakout`,
    title: "Brick Breakout | Retro Paddle & Ball LCD Arcade — BHALYAM",
    description:
      "Smash bricks, deflect high-speed balls, and control the bounce with authentic 90s handheld brick game paddle mechanics.",
    keywords: ["block breakout", "brick breaker", "retro breakout game"],
    ogTitle: "Brick Breakout | Retro Paddle & Ball Arcade — BHALYAM",
    ogDescription: "Authentic 90s handheld brick breakout arcade. Smash all bricks to win.",
    ogImage: `${BASE_URL}/og/breakout.jpg`,
    ogImageWidth: "774",
    ogImageHeight: "800",
    ogImageType: "image/jpeg",
    ogImageAlt: "Brick Breakout Paddle and Ball LCD Arcade Game",
    ogSiteName: DEFAULT_SITE_NAME,
    ogLocale: DEFAULT_LOCALE,
    ogType: "game",
    twitterCard: "summary_large_image",
    twitterSite: DEFAULT_TWITTER_HANDLE,
    twitterCreator: DEFAULT_TWITTER_HANDLE,
    twitterTitle: "Brick Breakout | Retro Paddle & Ball LCD Arcade — BHALYAM",
    twitterDescription: "Authentic 90s handheld brick breakout arcade. Smash all bricks to win.",
    twitterImage: `${BASE_URL}/og/breakout.jpg`,
    twitterImageAlt: "Brick Breakout Paddle and Ball LCD Arcade Game",
  },
};

function normalizeRouteMetadata(meta: RouteMetadata): RouteMetadata {
  const ogTitle = meta.ogTitle || meta.title;
  const ogDescription = meta.ogDescription || meta.description;
  const ogImage = toAbsoluteUrl(meta.ogImage || DEFAULT_OG_IMAGE);
  const isDefaultOg = ogImage === DEFAULT_OG_IMAGE;

  return {
    ...meta,
    canonical: meta.canonical || `${BASE_URL}${meta.path === "/" ? "/" : meta.path}`,
    ogTitle,
    ogDescription,
    ogImage,
    ogType: meta.ogType || "website",
    ogSiteName: meta.ogSiteName || DEFAULT_SITE_NAME,
    ogLocale: meta.ogLocale || DEFAULT_LOCALE,
    ogImageWidth: meta.ogImageWidth || (isDefaultOg ? DEFAULT_OG_WIDTH : "800"),
    ogImageHeight: meta.ogImageHeight || (isDefaultOg ? DEFAULT_OG_HEIGHT : "600"),
    ogImageType: meta.ogImageType || (ogImage.endsWith(".png") ? "image/png" : "image/jpeg"),
    ogImageAlt: meta.ogImageAlt || ogTitle,
    twitterCard: meta.twitterCard || DEFAULT_TWITTER_CARD,
    twitterSite: meta.twitterSite || DEFAULT_TWITTER_HANDLE,
    twitterCreator: meta.twitterCreator || DEFAULT_TWITTER_HANDLE,
    twitterTitle: meta.twitterTitle || ogTitle,
    twitterDescription: meta.twitterDescription || ogDescription,
    twitterImage: toAbsoluteUrl(meta.twitterImage || ogImage),
    twitterImageAlt: meta.twitterImageAlt || meta.ogImageAlt || ogTitle,
  };
}

export const PUBLIC_ROUTES_METADATA: Record<string, RouteMetadata> = Object.fromEntries(
  Object.entries(RAW_PUBLIC_ROUTES_METADATA).map(([key, meta]) => [
    key,
    normalizeRouteMetadata(meta),
  ])
);

export const PRERENDER_ROUTES = Object.keys(PUBLIC_ROUTES_METADATA);

/**
 * Catalog of game-specific social preview cards for multiplayer lounges and invitations.
 * Used for WhatsApp, Twitter, Discord, and Web Share integrations when creating rooms.
 */
export interface GameSocialShareData {
  game: string;
  name: string;
  shareTitle: string;
  shareDescription: string;
  imageUrl: string;
  imageWidth: string;
  imageHeight: string;
  imageType: string;
  imageAlt: string;
}

export const GAME_SOCIAL_METADATA: Record<string, GameSocialShareData> = {
  handcricket: {
    game: "handcricket",
    name: "Hand Cricket",
    shareTitle: "Hand Cricket Online | 90s School Classroom Showdown — BHALYAM",
    shareDescription: "Show fingers, score runs, take wickets! Replay 90s classroom Hand Cricket with your gang on BHALYAM.",
    imageUrl: `${BASE_URL}/og/handcricket.jpg`,
    imageWidth: "800",
    imageHeight: "533",
    imageType: "image/jpeg",
    imageAlt: "Hand Cricket Online Game Board",
  },
  ludo: {
    game: "ludo",
    name: "Ludo",
    shareTitle: "Ludo Lounge | Roll Sixes & Race Home — BHALYAM",
    shareDescription: "Classic Indian board game of rolling dice, cutting opponent tokens, and racing to the center triangle.",
    imageUrl: `${BASE_URL}/og/ludo.jpg`,
    imageWidth: "800",
    imageHeight: "800",
    imageType: "image/jpeg",
    imageAlt: "Ludo Lounge Multiplayer Board",
  },
  snl: {
    game: "snl",
    name: "Snakes & Ladders",
    shareTitle: "Snakes & Ladders | Climb Ladders & Dodge the 99 Snake — BHALYAM",
    shareDescription: "Nostalgic board game fun with ladders, sliding snakes, and nail-biting multiplayer finishes.",
    imageUrl: `${BASE_URL}/og/snl.jpg`,
    imageWidth: "800",
    imageHeight: "533",
    imageType: "image/jpeg",
    imageAlt: "Snakes and Ladders Board Game",
  },
  rummy: {
    game: "rummy",
    name: "Rummy",
    shareTitle: "Indian Rummy 13-Card Room | Pure Sequences & Sets — BHALYAM",
    shareDescription: "Classic 13-card Indian Rummy with wild jokers, drag-and-drop sorting, and instant declarations.",
    imageUrl: `${BASE_URL}/og/rummy.jpg`,
    imageWidth: "800",
    imageHeight: "533",
    imageType: "image/jpeg",
    imageAlt: "Indian Rummy Card Game Table",
  },
  uno: {
    game: "uno",
    name: "UNO",
    shareTitle: "UNO Blast | Color-Matching Party Card Game — BHALYAM",
    shareDescription: "Color-matching card mayhem! Drop Draw-Fours, skip friends, and race to shout UNO.",
    imageUrl: `${BASE_URL}/og/uno.jpg`,
    imageWidth: "800",
    imageHeight: "800",
    imageType: "image/jpeg",
    imageAlt: "UNO Blast Card Game Table",
  },
  dotsboxes: {
    game: "dotsboxes",
    name: "Dots & Boxes",
    shareTitle: "Dots & Boxes | Classic Notebook Territory Duel — BHALYAM",
    shareDescription: "Connect grid dots, close boxes, and claim territory in classic 90s school notebook style.",
    imageUrl: `${BASE_URL}/og/dotsboxes.jpg`,
    imageWidth: "800",
    imageHeight: "533",
    imageType: "image/jpeg",
    imageAlt: "Dots and Boxes Notebook Game",
  },
  stargame: {
    game: "stargame",
    name: "Star Game",
    shareTitle: "Star Game | Fast Chits Trading & Slapping — BHALYAM",
    shareDescription: "Four identical chits. Shuffle, trade, and slap the center star to score points with friends.",
    imageUrl: `${BASE_URL}/og/stargame.jpg`,
    imageWidth: "800",
    imageHeight: "533",
    imageType: "image/jpeg",
    imageAlt: "Star Game Chits Board",
  },
  bingo: {
    game: "bingo",
    name: "Bingo",
    shareTitle: "Bingo Lounge | Strike 5 Lines with Friends — BHALYAM",
    shareDescription: "Fill your 5x5 grid, call numbers, and strike B-I-N-G-O across rows, columns, and diagonals.",
    imageUrl: `${BASE_URL}/og/bingo.jpg`,
    imageWidth: "800",
    imageHeight: "533",
    imageType: "image/jpeg",
    imageAlt: "Bingo Numbers Board",
  },
  rps: {
    game: "rps",
    name: "Rock Paper Scissors",
    shareTitle: "Rock Paper Scissors | Speed Duels & Quick Rounds — BHALYAM",
    shareDescription: "Best-of-three speed duels with retro sounds, quick rematches, and childhood glory.",
    imageUrl: `${BASE_URL}/og/rps.jpg`,
    imageWidth: "800",
    imageHeight: "533",
    imageType: "image/jpeg",
    imageAlt: "Rock Paper Scissors Arena",
  },
  carrom: {
    game: "carrom",
    name: "Carrom",
    shareTitle: "Carrom Board Lounge | Striker & Queen Showdown — BHALYAM",
    shareDescription: "Pocket carrom men, sink the red queen, and control the striker in this classic veranda board game.",
    imageUrl: `${BASE_URL}/og/carrom.jpg`,
    imageWidth: "800",
    imageHeight: "533",
    imageType: "image/jpeg",
    imageAlt: "Carrom Board Lounge Table",
  },
  chess: {
    game: "chess",
    name: "Chess",
    shareTitle: "Chess Grandmaster | Tactical 90s Board Duels — BHALYAM",
    shareDescription: "Checkmates, timers, and strategic duels on a clean, responsive wooden board.",
    imageUrl: `${BASE_URL}/og/chess.jpg`,
    imageWidth: "800",
    imageHeight: "533",
    imageType: "image/jpeg",
    imageAlt: "Chess Grandmaster Board",
  },
  spacewar: {
    game: "spacewar",
    name: "Space War",
    shareTitle: "Space War 90s | Retro Pixel Galaxy Shooter — BHALYAM",
    shareDescription: "Blast enemy fleets, collect power-ups, and survive bullet hell in this retro arcade shooter.",
    imageUrl: `${BASE_URL}/og/spacewar.jpg`,
    imageWidth: "800",
    imageHeight: "533",
    imageType: "image/jpeg",
    imageAlt: "Space War Retro Arcade",
  },
  tambola: {
    game: "tambola",
    name: "Tambola",
    shareTitle: "Tambola (Housie) Lounge | Family Numbers Game — BHALYAM",
    shareDescription: "Early five, top line, full house! Enjoy India's favorite party numbers game online.",
    imageUrl: `${BASE_URL}/og/tambola.jpg`,
    imageWidth: "800",
    imageHeight: "533",
    imageType: "image/jpeg",
    imageAlt: "Tambola Housie Ticket Board",
  },
  nokiacricket: {
    game: "nokiacricket",
    name: "Nokia Cricket 2D",
    shareTitle: "Nokia Cricket 2D | Classic 90s Mobile Brick Cricket — BHALYAM",
    shareDescription: "Hit sixes and relive 90s Nokia 2D Cricket in authentic retro LCD monochrome glory.",
    imageUrl: `${BASE_URL}/og/nokiacricket.jpg`,
    imageWidth: "800",
    imageHeight: "787",
    imageType: "image/jpeg",
    imageAlt: "Nokia Cricket 2D Retro Game",
  },
  snake: {
    game: "snake",
    name: "Classic Snake",
    shareTitle: "Classic Nokia Snake | Original 90s 3310 Arcade — BHALYAM",
    shareDescription: "Classic Nokia 3310 Snake game right in your browser. Pure 90s retro arcade nostalgia.",
    imageUrl: `${BASE_URL}/og/snake.jpg`,
    imageWidth: "800",
    imageHeight: "533",
    imageType: "image/jpeg",
    imageAlt: "Classic Nokia 3310 Snake Game",
  },
  brickracer: {
    game: "brickracer",
    name: "Brick Racer",
    shareTitle: "Brick Racer 9999-in-1 | Retro Handheld Racing — BHALYAM",
    shareDescription: "Authentic 9999-in-1 handheld brick racing game. Dodge oncoming traffic and rack up high scores.",
    imageUrl: `${BASE_URL}/og/brickracer.jpg`,
    imageWidth: "800",
    imageHeight: "750",
    imageType: "image/jpeg",
    imageAlt: "Brick Racer 9999-in-1 Game",
  },
  brickblocks: {
    game: "brickblocks",
    name: "Brick Blocks",
    shareTitle: "Brick Blocks 9999-in-1 | Retro Handheld Falling Blocks — BHALYAM",
    shareDescription: "Play classic 90s handheld brick console Brick Blocks. Stack falling shapes and clear rows.",
    imageUrl: `${BASE_URL}/og/brickblocks.jpg`,
    imageWidth: "800",
    imageHeight: "800",
    imageType: "image/jpeg",
    imageAlt: "Brick Blocks Handheld Game",
  },
  tetris: {
    game: "tetris",
    name: "Classic Tetris",
    shareTitle: "Classic Tetris 90s | Retro Handheld Brick Puzzle — BHALYAM",
    shareDescription: "Rotate tetrominoes and clear lines in nostalgic 90s handheld brick puzzle glory.",
    imageUrl: `${BASE_URL}/og/tetris.jpg`,
    imageWidth: "800",
    imageHeight: "800",
    imageType: "image/jpeg",
    imageAlt: "Classic Tetris 90s Game",
  },
  breakout: {
    game: "breakout",
    name: "Brick Breakout",
    shareTitle: "Brick Breakout | Retro Paddle & Ball Arcade — BHALYAM",
    shareDescription: "Authentic 90s handheld brick breakout arcade. Deflect the ball and smash all bricks to win.",
    imageUrl: `${BASE_URL}/og/breakout.jpg`,
    imageWidth: "774",
    imageHeight: "800",
    imageType: "image/jpeg",
    imageAlt: "Brick Breakout Paddle Game",
  },
};

/**
 * Returns social sharing metadata for any game slug.
 */
export function getSocialMetadataForGame(game: string): GameSocialShareData | null {
  return GAME_SOCIAL_METADATA[game.toLowerCase()] || null;
}
