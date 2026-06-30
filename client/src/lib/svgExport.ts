/**
 * Serializes an in-DOM SVG element to a PNG Blob at a given pixel-density
 * scale. Originally built for Ludo's end-game recap card (download,
 * clipboard-copy, share); lifted here so other "render a result to a
 * shareable image" features — e.g. Rummy's printable score sheet
 * (docs/rummy/roadmap.md B.4) — reuse the same conversion instead of each
 * carrying its own SVG→canvas pipeline.
 */
export function svgToPngBlob(svg: SVGSVGElement, scale: number): Promise<Blob | null> {
  const { promise, resolve } = Promise.withResolvers<Blob | null>();
  const xml = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const w = svg.viewBox.baseVal.width || 800;
    const h = svg.viewBox.baseVal.height || 600;
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d");
    URL.revokeObjectURL(url);
    if (!ctx) {
      resolve(null);
      return;
    }
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, w, h);
    canvas.toBlob(resolve, "image/png");
  };
  img.src = url;
  return promise;
}
