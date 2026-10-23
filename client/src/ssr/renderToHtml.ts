import type { ReactNode } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { PassThrough } from "node:stream";

/** Static pages must finish Suspense content before hydration, not publish its fallback. */
export async function renderToHtml(content: ReactNode, timeoutMs = 30_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const output = new PassThrough();
    output.setEncoding("utf8");
    let html = "";
    let settled = false;
    const fail = (cause: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const error = cause instanceof Error ? cause : new Error(String(cause));
      reject(error);
      output.destroy();
      renderer.abort(error);
    };
    const timeout = setTimeout(() => fail(new Error("Static HTML rendering timed out")), timeoutMs);
    output.on("data", (chunk: string) => { html += chunk; });
    output.on("error", fail);
    output.on("end", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(html);
    });
    const renderer = renderToPipeableStream(content, {
      onAllReady() {
        if (!settled) renderer.pipe(output);
      },
      onShellError: fail,
      onError: fail,
    });
  });
}
