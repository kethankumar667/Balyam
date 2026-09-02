import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientRoot = path.resolve(__dirname, "..");
const distDir = path.resolve(clientRoot, "dist");
const ssrOutDir = path.resolve(distDir, "ssr");

async function prerender() {
  console.log("🚀 [Prerender] Starting static HTML prerendering for public routes...");

  // 1. Build the SSR bundle
  console.log("📦 [Prerender] Compiling SSR entry with Vite...");
  await build({
    root: clientRoot,
    build: {
      ssr: path.resolve(clientRoot, "src/entry-server.tsx"),
      outDir: ssrOutDir,
      emptyOutDir: true,
      minify: false,
    },
  });

  const ssrEntryPath = path.resolve(ssrOutDir, "entry-server.js");
  if (!fs.existsSync(ssrEntryPath)) {
    throw new Error(`SSR entry not found at: ${ssrEntryPath}`);
  }

  // 2. Load the compiled SSR render function AND the authoritative public
  // route catalog from the SAME import — `entry-server.tsx` re-exports
  // `PRERENDER_ROUTES` from `seo/metadata.ts` for exactly this reason (see
  // its own comment). One import, one source of truth: no second guessed
  // chunk path, no silent fallback to a smaller, stale route list. A build
  // that cannot load the real catalog must fail loudly here rather than
  // quietly prerendering fewer routes than the app actually has.
  const { render, PRERENDER_ROUTES } = await import(pathToFileURL(ssrEntryPath).href);

  if (!Array.isArray(PRERENDER_ROUTES) || PRERENDER_ROUTES.length === 0) {
    throw new Error(
      "Could not load the authoritative public route catalog (PRERENDER_ROUTES) from the " +
        "compiled SSR entry. Refusing to prerender a silently reduced route set. Check that " +
        "client/src/entry-server.tsx re-exports PRERENDER_ROUTES from client/src/seo/metadata.ts, " +
        "and that the SSR build at " +
        ssrEntryPath +
        " actually contains it.",
    );
  }

  // 3. Read template index.html
  const templatePath = path.resolve(distDir, "index.html");
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template index.html not found at: ${templatePath}`);
  }
  const templateHtml = fs.readFileSync(templatePath, "utf-8");

  const routesToPrerender = PRERENDER_ROUTES;

  console.log(
    `✨ [Prerender] Generating static HTML for ${routesToPrerender.length} public routes ` +
      "(authoritative catalog: seo/metadata.ts PUBLIC_ROUTES_METADATA).",
  );

  for (const url of routesToPrerender) {
    try {
      const { appHtml, metadata, jsonLdString } = render(url);

      let html = templateHtml;

      // Injected rendered app markup into #root
      html = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

      // Update title
      if (metadata?.title) {
        html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${metadata.title}</title>`);
      }

      // Update meta description
      if (metadata?.description) {
        if (/<meta\s+name=["']description["']/i.test(html)) {
          html = html.replace(
            /<meta\s+name=["']description["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
            `<meta name="description" content="${metadata.description}" />`
          );
        } else {
          html = html.replace("</head>", `  <meta name="description" content="${metadata.description}" />\n  </head>`);
        }
      }

      // Update keywords
      if (metadata?.keywords && metadata.keywords.length > 0) {
        const keywordsStr = metadata.keywords.join(", ");
        if (/<meta\s+name=["']keywords["']/i.test(html)) {
          html = html.replace(
            /<meta\s+name=["']keywords["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
            `<meta name="keywords" content="${keywordsStr}" />`
          );
        } else {
          html = html.replace("</head>", `  <meta name="keywords" content="${keywordsStr}" />\n  </head>`);
        }
      }

      // Update OpenGraph tags
      if (metadata?.ogTitle) {
        if (/<meta\s+property=["']og:title["']/i.test(html)) {
          html = html.replace(
            /<meta\s+property=["']og:title["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
            `<meta property="og:title" content="${metadata.ogTitle}" />`
          );
        } else {
          html = html.replace("</head>", `  <meta property="og:title" content="${metadata.ogTitle}" />\n  </head>`);
        }
      }

      if (metadata?.ogDescription) {
        if (/<meta\s+property=["']og:description["']/i.test(html)) {
          html = html.replace(
            /<meta\s+property=["']og:description["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
            `<meta property="og:description" content="${metadata.ogDescription}" />`
          );
        } else {
          html = html.replace(
            "</head>",
            `  <meta property="og:description" content="${metadata.ogDescription}" />\n  </head>`
          );
        }
      }

      // OpenGraph Site Name & Locale
      const ogSiteName = metadata?.ogSiteName || "BHALYAM · బాల్యం";
      if (/<meta\s+property=["']og:site_name["']/i.test(html)) {
        html = html.replace(
          /<meta\s+property=["']og:site_name["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
          `<meta property="og:site_name" content="${ogSiteName}" />`
        );
      } else {
        html = html.replace("</head>", `  <meta property="og:site_name" content="${ogSiteName}" />\n  </head>`);
      }

      const ogLocale = metadata?.ogLocale || "en_US";
      if (/<meta\s+property=["']og:locale["']/i.test(html)) {
        html = html.replace(
          /<meta\s+property=["']og:locale["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
          `<meta property="og:locale" content="${ogLocale}" />`
        );
      } else {
        html = html.replace("</head>", `  <meta property="og:locale" content="${ogLocale}" />\n  </head>`);
      }

      if (metadata?.ogImage) {
        if (/<meta\s+property=["']og:image["']/i.test(html)) {
          html = html.replace(
            /<meta\s+property=["']og:image["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
            `<meta property="og:image" content="${metadata.ogImage}" />`
          );
        } else {
          html = html.replace("</head>", `  <meta property="og:image" content="${metadata.ogImage}" />\n  </head>`);
        }

        // WhatsApp, Facebook, LinkedIn secure_url, dimensions & MIME type
        const ogImageSecure = metadata.ogImage;
        const ogImageType = metadata?.ogImageType || (metadata.ogImage.endsWith(".png") ? "image/png" : "image/jpeg");
        const ogImageWidth = metadata?.ogImageWidth || "1200";
        const ogImageHeight = metadata?.ogImageHeight || "630";
        const ogImageAlt = metadata?.ogImageAlt || metadata?.ogTitle || metadata?.title || "BHALYAM";

        if (/<meta\s+property=["']og:image:secure_url["']/i.test(html)) {
          html = html.replace(
            /<meta\s+property=["']og:image:secure_url["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
            `<meta property="og:image:secure_url" content="${ogImageSecure}" />`
          );
        } else {
          html = html.replace("</head>", `  <meta property="og:image:secure_url" content="${ogImageSecure}" />\n  </head>`);
        }

        if (/<meta\s+property=["']og:image:type["']/i.test(html)) {
          html = html.replace(
            /<meta\s+property=["']og:image:type["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
            `<meta property="og:image:type" content="${ogImageType}" />`
          );
        } else {
          html = html.replace("</head>", `  <meta property="og:image:type" content="${ogImageType}" />\n  </head>`);
        }

        if (/<meta\s+property=["']og:image:width["']/i.test(html)) {
          html = html.replace(
            /<meta\s+property=["']og:image:width["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
            `<meta property="og:image:width" content="${ogImageWidth}" />`
          );
        } else {
          html = html.replace("</head>", `  <meta property="og:image:width" content="${ogImageWidth}" />\n  </head>`);
        }

        if (/<meta\s+property=["']og:image:height["']/i.test(html)) {
          html = html.replace(
            /<meta\s+property=["']og:image:height["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
            `<meta property="og:image:height" content="${ogImageHeight}" />`
          );
        } else {
          html = html.replace("</head>", `  <meta property="og:image:height" content="${ogImageHeight}" />\n  </head>`);
        }

        if (/<meta\s+property=["']og:image:alt["']/i.test(html)) {
          html = html.replace(
            /<meta\s+property=["']og:image:alt["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
            `<meta property="og:image:alt" content="${ogImageAlt}" />`
          );
        } else {
          html = html.replace("</head>", `  <meta property="og:image:alt" content="${ogImageAlt}" />\n  </head>`);
        }
      }

      if (metadata?.ogType) {
        if (/<meta\s+property=["']og:type["']/i.test(html)) {
          html = html.replace(
            /<meta\s+property=["']og:type["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
            `<meta property="og:type" content="${metadata.ogType}" />`
          );
        } else {
          html = html.replace("</head>", `  <meta property="og:type" content="${metadata.ogType}" />\n  </head>`);
        }
      }

      if (metadata?.canonical) {
        if (/<link\s+rel=["']canonical["']/i.test(html)) {
          html = html.replace(
            /<link\s+rel=["']canonical["']\s+href=["'][\s\S]*?["']\s*\/?>/i,
            `<link rel="canonical" href="${metadata.canonical}" />`
          );
        } else {
          html = html.replace("</head>", `  <link rel="canonical" href="${metadata.canonical}" />\n  </head>`);
        }

        // Also update og:url
        if (/<meta\s+property=["']og:url["']/i.test(html)) {
          html = html.replace(
            /<meta\s+property=["']og:url["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
            `<meta property="og:url" content="${metadata.canonical}" />`
          );
        } else {
          html = html.replace("</head>", `  <meta property="og:url" content="${metadata.canonical}" />\n  </head>`);
        }
      }

      // Add Twitter card, site, creator, and tags
      const twitterCard = metadata?.twitterCard || "summary_large_image";
      if (/<meta\s+name=["']twitter:card["']/i.test(html)) {
        html = html.replace(
          /<meta\s+name=["']twitter:card["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
          `<meta name="twitter:card" content="${twitterCard}" />`
        );
      } else {
        html = html.replace("</head>", `  <meta name="twitter:card" content="${twitterCard}" />\n  </head>`);
      }

      const twitterSite = metadata?.twitterSite || "@bhalyam";
      if (/<meta\s+name=["']twitter:site["']/i.test(html)) {
        html = html.replace(
          /<meta\s+name=["']twitter:site["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
          `<meta name="twitter:site" content="${twitterSite}" />`
        );
      } else {
        html = html.replace("</head>", `  <meta name="twitter:site" content="${twitterSite}" />\n  </head>`);
      }

      const twitterCreator = metadata?.twitterCreator || "@bhalyam";
      if (/<meta\s+name=["']twitter:creator["']/i.test(html)) {
        html = html.replace(
          /<meta\s+name=["']twitter:creator["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
          `<meta name="twitter:creator" content="${twitterCreator}" />`
        );
      } else {
        html = html.replace("</head>", `  <meta name="twitter:creator" content="${twitterCreator}" />\n  </head>`);
      }

      const twitterTitle = metadata?.twitterTitle || metadata?.ogTitle || metadata?.title;
      if (twitterTitle) {
        if (/<meta\s+name=["']twitter:title["']/i.test(html)) {
          html = html.replace(
            /<meta\s+name=["']twitter:title["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
            `<meta name="twitter:title" content="${twitterTitle}" />`
          );
        } else {
          html = html.replace("</head>", `  <meta name="twitter:title" content="${twitterTitle}" />\n  </head>`);
        }
      }

      const twitterDesc = metadata?.twitterDescription || metadata?.ogDescription || metadata?.description;
      if (twitterDesc) {
        if (/<meta\s+name=["']twitter:description["']/i.test(html)) {
          html = html.replace(
            /<meta\s+name=["']twitter:description["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
            `<meta name="twitter:description" content="${twitterDesc}" />`
          );
        } else {
          html = html.replace("</head>", `  <meta name="twitter:description" content="${twitterDesc}" />\n  </head>`);
        }
      }

      const twitterImg = metadata?.twitterImage || metadata?.ogImage;
      if (twitterImg) {
        if (/<meta\s+name=["']twitter:image["']/i.test(html)) {
          html = html.replace(
            /<meta\s+name=["']twitter:image["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
            `<meta name="twitter:image" content="${twitterImg}" />`
          );
        } else {
          html = html.replace("</head>", `  <meta name="twitter:image" content="${twitterImg}" />\n  </head>`);
        }

        const twitterImgAlt = metadata?.twitterImageAlt || metadata?.ogImageAlt || twitterTitle || "BHALYAM";
        if (/<meta\s+name=["']twitter:image:alt["']/i.test(html)) {
          html = html.replace(
            /<meta\s+name=["']twitter:image:alt["']\s+content=["'][\s\S]*?["']\s*\/?>/i,
            `<meta name="twitter:image:alt" content="${twitterImgAlt}" />`
          );
        } else {
          html = html.replace("</head>", `  <meta name="twitter:image:alt" content="${twitterImgAlt}" />\n  </head>`);
        }
      }

      // Inject Schema.org JSON-LD structured data into <head>
      if (jsonLdString) {
        const jsonLdTag = `  <script type="application/ld+json" id="bhalyam-jsonld">\n${jsonLdString}\n  </script>`;
        html = html.replace("</head>", `${jsonLdTag}\n  </head>`);
      }

      // Target path
      const outPath =
        url === "/"
          ? path.resolve(distDir, "index.html")
          : path.resolve(distDir, url.replace(/^\//, ""), "index.html");

      const outDir = path.dirname(outPath);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      fs.writeFileSync(outPath, html, "utf-8");
      console.log(`  ✓ Prerendered: ${url.padEnd(20)} -> ${path.relative(clientRoot, outPath)}`);
    } catch (err) {
      console.error(`  ❌ Failed to prerender ${url}:`, err);
      throw err;
    }
  }

  // 4. Cleanup temporary ssr dir
  if (fs.existsSync(ssrOutDir)) {
    fs.rmSync(ssrOutDir, { recursive: true, force: true });
  }

  console.log("🎉 [Prerender] Static HTML prerendering successfully completed!\n");
}

prerender().catch((err) => {
  console.error("Prerender execution failed:", err);
  process.exit(1);
});
