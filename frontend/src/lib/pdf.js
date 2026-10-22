/**
 * Reads a resume PDF in the browser (nothing is uploaded). pdf.js is loaded on
 * first use only, so it doesn't weigh down the rest of the portal.
 *
 * Returns the text rebuilt line by line from the page layout, plus what the
 * format checks need: page count, size, fonts, and clickable links.
 */
export async function readPdf(file) {
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
  const fonts = new Set();
  const sizes = new Set();
  const links = [];
  const pageTexts = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // Group text runs into lines by their baseline, then order each line left to right.
    const rows = [];
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const y = item.transform[5], x = item.transform[4], h = Math.round(Math.abs(item.transform[3]) || item.height || 0);
      fonts.add(item.fontName); if (h) sizes.add(h);
      let row = rows.find((r) => Math.abs(r.y - y) <= Math.max(2, h * 0.35));
      if (!row) { row = { y, parts: [] }; rows.push(row); }
      row.parts.push({ x, w: item.width || 0, s: item.str });
    }
    rows.sort((a, b) => b.y - a.y);
    pageTexts.push(rows.map((r) => {
      r.parts.sort((a, b) => a.x - b.x);
      let line = "", end = null;
      for (const part of r.parts) {
        if (end !== null && part.x - end > 2 && !line.endsWith(" ") && !part.s.startsWith(" ")) line += " ";
        line += part.s; end = part.x + part.w;
      }
      return line.replace(/\s+/g, " ").trim();
    }).join("\n"));
    for (const a of await page.getAnnotations()) {
      if (a.subtype === "Link" && a.url) links.push(a.url);
    }
  }
  const text = pageTexts.join("\n\n");
  return {
    text,
    meta: {
      fileName: file.name,
      sizeKB: Math.round(file.size / 1024),
      pages: doc.numPages,
      chars: text.replace(/\s/g, "").length,
      fonts: fonts.size,
      fontSizes: sizes.size,
      links: [...new Set(links)],
    },
  };
}
