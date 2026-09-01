export interface FAQItem {
  question: string;
  answer: string;
}

/**
 * Builds a Schema.org FAQPage JSON-LD object.
 * Strips HTML and validates question/answer pairs according to Google Search Central guidelines.
 */
export function buildFaqSchema(faqs: FAQItem[]) {
  const sanitizedFaqs = faqs
    .filter((f) => f.question && f.answer)
    .map((f) => ({
      "@type": "Question",
      name: f.question.trim(),
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer.replace(/<[^>]+>/g, "").trim(),
      },
    }));

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: sanitizedFaqs,
  };
}

/**
 * Canonical Support & FAQs dataset for BHALYAM structured data.
 */
export const SUPPORT_FAQS_LIST: FAQItem[] = [
  {
    question: "Do I need an account to play BHALYAM?",
    answer:
      "No! BHALYAM is open to all visitors. As a guest, you can immediately join any room code, play solo vs bots, run pass & play seats on your phone, and enjoy voice chat. Creating a free Member account unlocks hosting shareable rooms, tracking lifetime XP & achievements, and participating in weekly tournaments.",
  },
  {
    question: "How do I start my very first game?",
    answer:
      "From the Home page or Games catalog, click on any game tile (e.g. Hand Cricket or Ludo), choose 'Play Solo vs Bot' or 'Create Room', and you will enter your private lounge in less than two seconds.",
  },
  {
    question: "Can I play on my mobile phone browser?",
    answer:
      "Yes! BHALYAM is 100% responsive and optimized for mobile touchscreens (Chrome, Safari, Firefox). All touch targets meet the 44x44px accessibility standard, and games like Rummy include touch drag-and-drop card ordering.",
  },
  {
    question: "How do I create and share a room with friends?",
    answer:
      "Click 'Create Room' on any game, pick your room settings (e.g. 2-player or 4-player), and you'll receive a 6-character room code. Tap 'Share Invite' to send a direct WhatsApp link or copy the room URL.",
  },
  {
    question: "How do I join someone else's room?",
    answer:
      "Click 'Join Room' on the top navigation, type the 6-character room code (e.g. LUDO99), and you will immediately land in their lounge.",
  },
  {
    question: "What happens if the room host leaves the match?",
    answer:
      "BHALYAM features automatic Host Failover. If the host disconnects or leaves, the server seamlessly promotes the next active human player in the lounge to host without interrupting gameplay.",
  },
  {
    question: "Can I add bot players to fill empty seats?",
    answer:
      "Yes! In any lounge before the game starts, the host can click 'Add Bot' to fill empty seats with automated players with realistic human-like think delays.",
  },
  {
    question: "How do turn timers work?",
    answer:
      "Every player gets a fixed turn duration (typically 30–45 seconds depending on the game). A pulsing 10-second warning banner appears when your time is running low. If time expires, the server executes a default safe move to keep the match moving.",
  },
  {
    question: "What happens if I disconnect in the middle of a match?",
    answer:
      "Your seat is held for 600 seconds (10 minutes) via a server-signed cryptographic seatToken. Simply reopen the link or re-enter the room code on your device to immediately resume your turn and cards.",
  },
  {
    question: "Can a bot replace me if my network drops?",
    answer:
      "Yes! While you are disconnected, a temporary background bot will keep your seat active so other players aren't forced to wait. The moment you reconnect, you regain full manual control of your seat.",
  },
  {
    question: "How does 'Pass & Play' work on a single device?",
    answer:
      "Pass & Play lets multiple friends play on one shared phone or laptop. A privacy intermission screen ('Pass the phone to...') shields hidden hands between turns in games like Rummy and Hand Cricket.",
  },
  {
    question: "How do I earn Experience Points (XP) and level up?",
    answer:
      "You earn XP by completing matches, winning games, maintaining win streaks, and unlocking achievements. Leveling up unlocks prestigious profile borders and badges.",
  },
  {
    question: "How do achievements work?",
    answer:
      "BHALYAM features 25 childhood and competitive achievements across Progression, Skill, Resilience, and Social categories. Progress is automatically tracked on the server.",
  },
  {
    question: "Can I customize my display name and avatar?",
    answer:
      "Yes! Head to your Profile page or tap your avatar in the sidebar to choose from nostalgic Indian schoolboy and schoolgirl avatars or update your display name.",
  },
  {
    question: "How does in-room Voice Chat work?",
    answer:
      "BHALYAM uses peer-to-peer WebRTC mesh voice calling. Audio is transmitted directly between players and is NEVER recorded, stored, or processed on our servers.",
  },
  {
    question: "The game appears stuck or disconnected. What should I do?",
    answer:
      "First, check your internet connection. You can refresh your browser page at any time — the platform's ConnectionStateManager will automatically re-attach your seat to the active room.",
  },
  {
    question: "How do I report an abusive player or cheater?",
    answer:
      "Click 'Report' in the room menu or visit our Contact Us page to submit a confidential report with match telemetry for moderator review.",
  },
  {
    question: "How do I block or mute someone in voice or chat?",
    answer:
      "Tap the player's name in the room player list and select 'Mute Voice' or 'Block Chat' to instantly silence their incoming audio and text messages for your device.",
  },
  {
    question: "Is BHALYAM free to play?",
    answer:
      "Yes! BHALYAM is 100% free to play. There are no pay-to-win mechanics, gambling elements, or mandatory subscriptions.",
  },
];

/**
 * How to Play FAQ dataset.
 */
export const HOW_TO_PLAY_FAQS_LIST: FAQItem[] = [
  {
    question: "How do I invite my friends to a game on BHALYAM?",
    answer:
      "After creating a game lounge, tap 'Share Invite' or copy the 6-character room code (e.g. ROOM-7X29). Friends can join by tapping the shared WhatsApp/Web link or by clicking 'Join Room' and entering the code.",
  },
  {
    question: "Do my friends need to install any app?",
    answer:
      "No app download or installation is required! BHALYAM runs entirely in any modern web browser across iPhone, Android, tablets, laptops, and desktops.",
  },
  {
    question: "What happens if someone's network drops during a game?",
    answer:
      "BHALYAM holds the player's seat for 600 seconds with cryptographic tokens while an automated bot temporarily plays safe moves to keep the game rolling until the player reconnects.",
  },
  {
    question: "Can multiple people play together on one phone?",
    answer:
      "Yes! Pass & Play mode allows multiple players to share a single device with automated privacy gates between secret turns.",
  },
];
