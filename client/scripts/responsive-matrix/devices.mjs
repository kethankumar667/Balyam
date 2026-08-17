/**
 * Production-grade responsive device matrix for BHALYAM (బాల్యం).
 *
 * Categorized by:
 * 1. Viewport classes (CSS pixels)
 * 2. Real-world Indian Android market hardware (Redmi, POCO, OPPO, Vivo, Moto, OnePlus, Nothing, Samsung)
 * 3. Modern iOS line-up (iPhone SE to 15 Pro Max)
 * 4. Extreme edge-cases (320px, 344px, tall 20:9 screens)
 * 5. Landscape matrices for gaming orientation
 * 6. Tablets and foldable viewports
 */

// ─────────────────────────────────────────────────────────
// 1. SMALL PHONES (320px – 360px CSS width)
// ─────────────────────────────────────────────────────────
export const SMALL_PHONES = [
  {
    name: "Tiny_iPhone_5S_SE1_320",
    category: "small_phone",
    width: 320,
    height: 568,
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    description: "Absolute minimum width supported (320px compact)",
  },
  {
    name: "Android_Small_320x640",
    category: "small_phone",
    width: 320,
    height: 640,
    deviceScaleFactor: 1.5,
    hasTouch: true,
    isMobile: true,
    description: "Budget Android 320px tall screen",
  },
  {
    name: "Narrow_Fold_Cover_344",
    category: "small_phone",
    width: 344,
    height: 700,
    deviceScaleFactor: 2.5,
    hasTouch: true,
    isMobile: true,
    description: "Foldable front cover screen (Galaxy Z Fold narrow)",
  },
  {
    name: "Android_Classic_360x640",
    category: "small_phone",
    width: 360,
    height: 640,
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    description: "Legacy 16:9 Android standard",
  },
  {
    name: "Galaxy_S20_360x740",
    category: "small_phone",
    width: 360,
    height: 740,
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
    description: "Samsung 360x740 viewport tier",
  },
  {
    name: "Android_Compact_360x800",
    category: "small_phone",
    width: 360,
    height: 800,
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    description: "20:9 compact Android budget phone",
  },
  {
    name: "Galaxy_S23_360x780",
    category: "small_phone",
    width: 360,
    height: 780,
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
    description: "Samsung modern 360x780 profile",
  },
];

// ─────────────────────────────────────────────────────────
// 2. STANDARD PHONES (375px – 412px CSS width)
// ─────────────────────────────────────────────────────────
export const STANDARD_PHONES = [
  {
    name: "iPhone_SE_2_3_375x667",
    category: "iphone",
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    description: "iPhone SE (2nd/3rd gen) standard baseline",
  },
  {
    name: "iPhone_X_11Pro_375x812",
    category: "iphone",
    width: 375,
    height: 812,
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
    description: "iPhone notched 375pt viewport with home indicator",
  },
  {
    name: "iPhone_12_13_14_390x844",
    category: "iphone",
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
    description: "iPhone 12/13/14 standard 390pt baseline",
  },
  {
    name: "iPhone_14Pro_15_16_393x852",
    category: "iphone",
    width: 393,
    height: 852,
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
    description: "iPhone Dynamic Island 393pt baseline",
  },
  {
    name: "Pixel_7_8_412x915",
    category: "standard_phone",
    width: 412,
    height: 915,
    deviceScaleFactor: 2.625,
    hasTouch: true,
    isMobile: true,
    description: "Google Pixel standard 412pt baseline",
  },
  {
    name: "Galaxy_A54_S24_412x915",
    category: "standard_phone",
    width: 412,
    height: 915,
    deviceScaleFactor: 2.625,
    hasTouch: true,
    isMobile: true,
    description: "Samsung Galaxy A-series / S-series standard",
  },
];

// ─────────────────────────────────────────────────────────
// 3. INDIAN ANDROID DEVICE PROFILES
// ─────────────────────────────────────────────────────────
export const INDIAN_ANDROID_DEVICES = [
  // Redmi / Xiaomi
  { name: "Redmi_12_13C_393", category: "indian_android", width: 393, height: 873, deviceScaleFactor: 2.25, hasTouch: true, isMobile: true, description: "Redmi entry/mid 20:9" },
  { name: "Redmi_Note_12_13_412", category: "indian_android", width: 412, height: 915, deviceScaleFactor: 2.75, hasTouch: true, isMobile: true, description: "Redmi Note series bestselling Indian tier" },
  { name: "Xiaomi_14_412", category: "indian_android", width: 412, height: 915, deviceScaleFactor: 3, hasTouch: true, isMobile: true, description: "Xiaomi flagship 412x915" },

  // POCO
  { name: "POCO_M6_C65_393", category: "indian_android", width: 393, height: 873, deviceScaleFactor: 2.25, hasTouch: true, isMobile: true, description: "POCO M-series popular Indian phone" },
  { name: "POCO_X6_Pro_412", category: "indian_android", width: 412, height: 915, deviceScaleFactor: 3, hasTouch: true, isMobile: true, description: "POCO X6 Pro 1.5K display CSS viewport" },

  // OPPO
  { name: "OPPO_A78_A79_393", category: "indian_android", width: 393, height: 873, deviceScaleFactor: 2.4, hasTouch: true, isMobile: true, description: "OPPO A-series popular midranger" },
  { name: "OPPO_A98_393", category: "indian_android", width: 393, height: 873, deviceScaleFactor: 2.4, hasTouch: true, isMobile: true, description: "OPPO A98 393x873" },
  { name: "OPPO_Reno_11_12_412", category: "indian_android", width: 412, height: 915, deviceScaleFactor: 3, hasTouch: true, isMobile: true, description: "OPPO Reno flagship Indian tier" },

  // Vivo
  { name: "Vivo_Y27_Y28_393", category: "indian_android", width: 393, height: 873, deviceScaleFactor: 2.25, hasTouch: true, isMobile: true, description: "Vivo Y-series budget bestselling" },
  { name: "Vivo_V29_V30_412", category: "indian_android", width: 412, height: 915, deviceScaleFactor: 2.75, hasTouch: true, isMobile: true, description: "Vivo V-series popular Indian tier" },

  // Motorola
  { name: "Moto_E13_360", category: "indian_android", width: 360, height: 800, deviceScaleFactor: 2, hasTouch: true, isMobile: true, description: "Moto E-series 360x800 entry tier" },
  { name: "Moto_G54_G64_393", category: "indian_android", width: 393, height: 873, deviceScaleFactor: 2.4, hasTouch: true, isMobile: true, description: "Moto G-series standard 5G Indian phone" },
  { name: "Moto_G84_Edge_412", category: "indian_android", width: 412, height: 915, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true, description: "Moto G84 / Edge series" },

  // OnePlus
  { name: "OnePlus_Nord_CE3_412", category: "indian_android", width: 412, height: 915, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true, description: "OnePlus Nord CE series" },
  { name: "OnePlus_11_12_412", category: "indian_android", width: 412, height: 915, deviceScaleFactor: 3.5, hasTouch: true, isMobile: true, description: "OnePlus flagship high DPR" },

  // Nothing
  { name: "Nothing_Phone_2a_412", category: "indian_android", width: 412, height: 915, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true, description: "Nothing Phone (2a) Indian market" },

  // Realme
  { name: "Realme_11_12_Pro_412", category: "indian_android", width: 412, height: 915, deviceScaleFactor: 2.75, hasTouch: true, isMobile: true, description: "Realme Number series bestseller" },
];

// ─────────────────────────────────────────────────────────
// 4. LARGE PHONES (428px – 480px CSS width)
// ─────────────────────────────────────────────────────────
export const LARGE_PHONES = [
  { name: "iPhone_14_Plus_428", category: "iphone", width: 428, height: 926, deviceScaleFactor: 3, hasTouch: true, isMobile: true, description: "iPhone Plus 428pt viewport" },
  { name: "iPhone_15_16_Pro_Max_430", category: "iphone", width: 430, height: 932, deviceScaleFactor: 3, hasTouch: true, isMobile: true, description: "iPhone Pro Max 430pt viewport" },
  { name: "Android_Large_432x960", category: "large_phone", width: 432, height: 960, deviceScaleFactor: 2.5, hasTouch: true, isMobile: true, description: "Large 432px Android viewport" },
  { name: "Android_XL_480x960", category: "large_phone", width: 480, height: 960, deviceScaleFactor: 2, hasTouch: true, isMobile: true, description: "Extra-large 480px width (high zoom / phablet)" },
];

// ─────────────────────────────────────────────────────────
// 5. EXTREME / EDGE CASES
// ─────────────────────────────────────────────────────────
export const EXTREME_EDGE_CASES = [
  { name: "Tiny_320x568", category: "extreme_edge", width: 320, height: 568, deviceScaleFactor: 2, hasTouch: true, isMobile: true, description: "Absolute minimum mobile viewport (iPhone SE 1st gen)" },
  { name: "Narrow_344x700", category: "extreme_edge", width: 344, height: 700, deviceScaleFactor: 2.5, hasTouch: true, isMobile: true, description: "Foldable front cover screen" },
  { name: "Tall_UltraWide_360x900", category: "extreme_edge", width: 360, height: 900, deviceScaleFactor: 3, hasTouch: true, isMobile: true, description: "Sony / Tall 21:9 or 20.5:9 display" },
  { name: "Short_Landscape_Browser_640x320", category: "extreme_edge", width: 640, height: 320, deviceScaleFactor: 2, hasTouch: true, isMobile: true, isLandscape: true, description: "Short landscape with on-screen browser bar" },
];

// ─────────────────────────────────────────────────────────
// 6. TABLETS & FOLDABLES
// ─────────────────────────────────────────────────────────
export const TABLETS = [
  { name: "Android_Tablet_600x960", category: "tablet", width: 600, height: 960, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true, description: "7-inch / 8-inch Android tablet" },
  { name: "iPad_Mini_768x1024", category: "tablet", width: 768, height: 1024, deviceScaleFactor: 2, hasTouch: true, isMobile: true, description: "iPad Mini tablet baseline" },
  { name: "Galaxy_Tab_800x1280", category: "tablet", width: 800, height: 1280, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true, description: "Samsung Galaxy Tab 800pt" },
  { name: "iPad_Air_10th_820x1180", category: "tablet", width: 820, height: 1180, deviceScaleFactor: 2, hasTouch: true, isMobile: true, description: "iPad 10.9-inch standard" },
];

// ─────────────────────────────────────────────────────────
// 7. LANDSCAPE GAMING PROFILES (Critical for Rummy, UNO, Ludo, Hand Cricket)
// ─────────────────────────────────────────────────────────
export const LANDSCAPE_PROFILES = [
  { name: "Landscape_SmallPhone_640x360", category: "landscape", width: 640, height: 360, deviceScaleFactor: 2, hasTouch: true, isMobile: true, isLandscape: true, description: "Small phone landscape" },
  { name: "Landscape_iPhone_SE_667x375", category: "landscape", width: 667, height: 375, deviceScaleFactor: 2, hasTouch: true, isMobile: true, isLandscape: true, description: "iPhone SE landscape" },
  { name: "Landscape_Galaxy_S20_740x360", category: "landscape", width: 740, height: 360, deviceScaleFactor: 3, hasTouch: true, isMobile: true, isLandscape: true, description: "Galaxy S20 landscape" },
  { name: "Landscape_Compact_800x360", category: "landscape", width: 800, height: 360, deviceScaleFactor: 2, hasTouch: true, isMobile: true, isLandscape: true, description: "Budget Android 20:9 landscape" },
  { name: "Landscape_iPhone_13_844x390", category: "landscape", width: 844, height: 390, deviceScaleFactor: 3, hasTouch: true, isMobile: true, isLandscape: true, description: "iPhone 13/14 landscape" },
  { name: "Landscape_iPhone_15_852x393", category: "landscape", width: 852, height: 393, deviceScaleFactor: 3, hasTouch: true, isMobile: true, isLandscape: true, description: "iPhone 15 Pro landscape" },
  { name: "Landscape_Android_Indian_873x393", category: "landscape", width: 873, height: 393, deviceScaleFactor: 2.4, hasTouch: true, isMobile: true, isLandscape: true, description: "Redmi/POCO/OPPO standard landscape" },
  { name: "Landscape_Pixel_Galaxy_915x412", category: "landscape", width: 915, height: 412, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true, isLandscape: true, description: "Pixel & Galaxy A54 landscape" },
  { name: "Landscape_iPhone_Max_932x430", category: "landscape", width: 932, height: 430, deviceScaleFactor: 3, hasTouch: true, isMobile: true, isLandscape: true, description: "iPhone Pro Max landscape" },
  { name: "Landscape_Wide_1024x480", category: "landscape", width: 1024, height: 480, deviceScaleFactor: 2, hasTouch: true, isMobile: true, isLandscape: true, description: "Phablet / wide device landscape" },
];

// ─────────────────────────────────────────────────────────
// TIERED SELECTIONS FOR CI / LOCAL RUNS
// ─────────────────────────────────────────────────────────

/**
 * Tier 1 — PR Fast Check (~15 profiles)
 * Covers every critical breakpoint, both orientations, Indian flagships, budget devices, and tablets.
 */
export const TIER_1_PROFILES = [
  // Small & Edge
  { name: "Tiny_320x568", category: "small_phone", width: 320, height: 568, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
  { name: "Narrow_344x700", category: "small_phone", width: 344, height: 700, deviceScaleFactor: 2.5, hasTouch: true, isMobile: true },
  { name: "Android_Small_360x640", category: "small_phone", width: 360, height: 640, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
  { name: "Galaxy_S20_360x740", category: "small_phone", width: 360, height: 740, deviceScaleFactor: 3, hasTouch: true, isMobile: true },
  { name: "Android_Compact_360x800", category: "small_phone", width: 360, height: 800, deviceScaleFactor: 2, hasTouch: true, isMobile: true },

  // Standard
  { name: "iPhone_SE_375x667", category: "iphone", width: 375, height: 667, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
  { name: "iPhone_14_390x844", category: "iphone", width: 390, height: 844, deviceScaleFactor: 3, hasTouch: true, isMobile: true },
  { name: "iPhone_15_Pro_393x852", category: "iphone", width: 393, height: 852, deviceScaleFactor: 3, hasTouch: true, isMobile: true },
  { name: "Redmi_Standard_393x873", category: "indian_android", width: 393, height: 873, deviceScaleFactor: 2.25, hasTouch: true, isMobile: true },
  { name: "POCO_Wide_412x915", category: "indian_android", width: 412, height: 915, deviceScaleFactor: 2.75, hasTouch: true, isMobile: true },
  { name: "Pixel_7_412x915", category: "standard_phone", width: 412, height: 915, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true },

  // Large & Tablets
  { name: "iPhone_15_Pro_Max_430x932", category: "large_phone", width: 430, height: 932, deviceScaleFactor: 3, hasTouch: true, isMobile: true },
  { name: "Android_XL_480x960", category: "large_phone", width: 480, height: 960, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
  { name: "iPad_Mini_768x1024", category: "tablet", width: 768, height: 1024, deviceScaleFactor: 2, hasTouch: true, isMobile: true },

  // Critical Landscape
  { name: "Landscape_iPhone_852x393", category: "landscape", width: 852, height: 393, deviceScaleFactor: 3, hasTouch: true, isMobile: true, isLandscape: true },
  { name: "Landscape_Android_915x412", category: "landscape", width: 915, height: 412, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true, isLandscape: true },
];

/**
 * Tier 2 — Main Merge (~35 profiles)
 * Expands with individual Indian OEMs (OPPO, Vivo, Moto, OnePlus, Nothing) and all landscape sizes.
 */
export const TIER_2_PROFILES = [
  ...TIER_1_PROFILES,
  ...INDIAN_ANDROID_DEVICES,
  ...LANDSCAPE_PROFILES.slice(0, 6),
  ...TABLETS,
];

/**
 * Tier 3 — Nightly / Release Full Matrix (All ~80+ profiles)
 */
export const ALL_DEVICE_PROFILES = [
  ...SMALL_PHONES,
  ...STANDARD_PHONES,
  ...INDIAN_ANDROID_DEVICES,
  ...LARGE_PHONES,
  ...EXTREME_EDGE_CASES,
  ...TABLETS,
  ...LANDSCAPE_PROFILES,
];
