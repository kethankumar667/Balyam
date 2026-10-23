// @vitest-environment node
import { lazy, Suspense } from "react";
import { describe, expect, it } from "vitest";
import { renderToHtml } from "../renderToHtml";

describe("static HTML rendering", () => {
  it("waits for nested lazy content without emitting unfinished boundaries", async () => {
    const Inner = lazy(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { default: () => <p>Ready to hydrate</p> };
    });
    const Outer = lazy(async () => ({
      default: () => <Suspense fallback={<p>Loading inner</p>}><Inner /></Suspense>,
    }));

    const html = await renderToHtml(
      <Suspense fallback={<p>Loading outer</p>}><Outer /></Suspense>,
    );

    expect(html).toContain("Ready to hydrate");
    expect(html).not.toContain("Loading");
    expect(html).not.toContain("<!--$!-->");
    expect(html).not.toContain("<!--$?-->");
  });

  it("renders synchronous content", async () => {
    expect(await renderToHtml(<h1>My Records</h1>)).toBe("<h1>My Records</h1>");
  });

  it("rejects lazy import failures instead of publishing a fallback", async () => {
    const Broken = lazy(async () => { throw new Error("Chunk unavailable"); });
    await expect(renderToHtml(
      <Suspense fallback={<p>Loading</p>}><Broken /></Suspense>,
    )).rejects.toThrow("Chunk unavailable");
  });

  it("rejects errors outside a Suspense boundary", async () => {
    function Broken(): never { throw new Error("Invalid page"); }
    await expect(renderToHtml(<Broken />)).rejects.toThrow("Invalid page");
  });

  it("aborts unresolved content instead of hanging the build", async () => {
    const Pending = lazy(() => new Promise<never>(() => {}));
    await expect(renderToHtml(
      <Suspense fallback={<p>Loading</p>}><Pending /></Suspense>, 20,
    )).rejects.toThrow("Static HTML rendering timed out");
  });
});
