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

  // 2. Load the compiled SSR render function & metadata
  const { render } = await import(pathToFileURL(ssrEntryPath).href);
  const metadataModule = await import(
    pathToFileURL(path.resolve(ssrOutDir, "assets/metadata.js")).href
  ).catch(async () => {
    // If bundled into entry-server directly:
    return await import(pathToFileURL(ssrEntryPath).href);
  });

  const publicRoutesMetadata =
    metadataModule.PUBLIC_ROUTES_METADATA ||
    (await import("../src/seo/metadata.js").catch(() => null))?.PUBLIC_ROUTES_METADATA;

  // 3. Read template index.html
  const templatePath = path.resolve(distDir, "index.html");
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template index.html not found at: ${templatePath}`);
  }
  const templateHtml = fs.readFileSync(templatePath, "utf-8");

  // Define public routes to prerender
  const routesToPrerender = [
    "/",
    "/games",
    "/about",
    "/privacy",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/nokiacricket",
    "/snake",
    "/brickracer",
    "/tetris",
    "/breakout",
    "/spacealien",
  ];

  console.log(`✨ [Prerender] Generating static HTML for ${routesToPrerender.length} public routes...`);

  for (const url of routesToPrerender) {
    try {
      const { appHtml, metadata } = render(url);

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

      // Add Twitter card if absent
      if (!/<meta\s+name=["']twitter:card["']/i.test(html)) {
        html = html.replace(
          "</head>",
          `  <meta name="twitter:card" content="summary_large_image" />\n  </head>`
        );
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
