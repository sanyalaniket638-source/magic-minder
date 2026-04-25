import { PDFDocument } from "pdf-lib";
import jsPDF from "jspdf";
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";
import { saveAs } from "file-saver";

// Configure pdf.js worker via CDN matching installed version
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export type TargetFormat =
  | "pdf"
  | "jpg"
  | "png"
  | "webp"
  | "txt"
  | "html"
  | "bin";

export const FORMAT_LABELS: Record<TargetFormat, string> = {
  pdf: "PDF",
  jpg: "JPG",
  png: "PNG",
  webp: "WebP",
  txt: "Text",
  html: "HTML",
  bin: "Binary",
};

const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "gif", "bmp"];

export function getExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function getCompatibleTargets(filename: string): TargetFormat[] {
  const ext = getExtension(filename);
  if (ext === "pdf") return ["jpg", "png", "webp", "txt", "bin"];
  if (IMAGE_EXTS.includes(ext)) return ["pdf", "jpg", "png", "webp", "bin"];
  if (ext === "docx") return ["html", "txt", "pdf", "bin"];
  if (["txt", "md", "csv", "json", "html", "xml"].includes(ext))
    return ["pdf", "txt", "html", "bin"];
  return ["bin"];
}

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

function readAsText(file: File): Promise<string> {
  return file.text();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function imageToFormat(
  file: File,
  target: TargetFormat
): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    if (target === "jpg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
    const mime =
      target === "jpg"
        ? "image/jpeg"
        : target === "png"
        ? "image/png"
        : "image/webp";
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject()), mime, 0.95)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function imageToPdf(file: File): Promise<Blob> {
  const buf = await readAsArrayBuffer(file);
  const pdf = await PDFDocument.create();
  const ext = getExtension(file.name);
  let img;
  if (ext === "png") img = await pdf.embedPng(buf);
  else if (ext === "jpg" || ext === "jpeg") img = await pdf.embedJpg(buf);
  else {
    // Convert any other image to PNG via canvas first
    const pngBlob = await imageToFormat(file, "png");
    img = await pdf.embedPng(await pngBlob.arrayBuffer());
  }
  const page = pdf.addPage([img.width, img.height]);
  page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

async function pdfToImages(
  file: File,
  target: "jpg" | "png" | "webp"
): Promise<Blob> {
  const buf = await readAsArrayBuffer(file);
  // @ts-ignore
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const mime =
    target === "jpg" ? "image/jpeg" : target === "png" ? "image/png" : "image/webp";

  if (pdf.numPages === 1) {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject()), mime, 0.95)
    );
  }

  // Multi-page: zip-like approach not available; combine vertically into one image
  const pages: HTMLCanvasElement[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    pages.push(canvas);
  }
  const width = Math.max(...pages.map((c) => c.width));
  const height = pages.reduce((s, c) => s + c.height, 0);
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const octx = out.getContext("2d")!;
  octx.fillStyle = "#ffffff";
  octx.fillRect(0, 0, width, height);
  let y = 0;
  for (const c of pages) {
    octx.drawImage(c, 0, y);
    y += c.height;
  }
  return await new Promise<Blob>((resolve, reject) =>
    out.toBlob((b) => (b ? resolve(b) : reject()), mime, 0.95)
  );
}

async function pdfToText(file: File): Promise<Blob> {
  const buf = await readAsArrayBuffer(file);
  // @ts-ignore
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text +=
      content.items.map((it: any) => it.str).join(" ") + "\n\n";
  }
  return new Blob([text], { type: "text/plain" });
}

async function docxConvert(
  file: File,
  target: TargetFormat
): Promise<Blob> {
  const buf = await readAsArrayBuffer(file);
  if (target === "html") {
    const { value } = await mammoth.convertToHtml({ arrayBuffer: buf });
    return new Blob([wrapHtml(value)], { type: "text/html" });
  }
  if (target === "txt") {
    const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
    return new Blob([value], { type: "text/plain" });
  }
  if (target === "pdf") {
    const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
    return textToPdf(value);
  }
  return new Blob([buf], { type: "application/octet-stream" });
}

function wrapHtml(body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Converted</title></head><body>${body}</body></html>`;
}

function textToPdf(text: string): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
  const lineHeight = 14;
  const lines = doc.splitTextToSize(text || " ", maxWidth);
  let y = margin;
  doc.setFontSize(11);
  for (const line of lines) {
    if (y > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  }
  return doc.output("blob");
}

async function textConvert(
  file: File,
  target: TargetFormat
): Promise<Blob> {
  const text = await readAsText(file);
  if (target === "pdf") return textToPdf(text);
  if (target === "txt") return new Blob([text], { type: "text/plain" });
  if (target === "html")
    return new Blob([wrapHtml(`<pre>${escapeHtml(text)}</pre>`)], {
      type: "text/html",
    });
  return new Blob([text], { type: "application/octet-stream" });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

export async function convertFile(
  file: File,
  target: TargetFormat
): Promise<{ blob: Blob; filename: string }> {
  const ext = getExtension(file.name);
  const baseName = file.name.replace(/\.[^.]+$/, "") || "converted";

  let blob: Blob;

  if (target === "bin") {
    const buf = await readAsArrayBuffer(file);
    blob = new Blob([buf], { type: "application/octet-stream" });
  } else if (IMAGE_EXTS.includes(ext)) {
    if (target === "pdf") blob = await imageToPdf(file);
    else if (target === "jpg" || target === "png" || target === "webp")
      blob = await imageToFormat(file, target);
    else throw new Error(`Cannot convert image to ${target}`);
  } else if (ext === "pdf") {
    if (target === "jpg" || target === "png" || target === "webp")
      blob = await pdfToImages(file, target);
    else if (target === "txt") blob = await pdfToText(file);
    else throw new Error(`Cannot convert PDF to ${target}`);
  } else if (ext === "docx") {
    blob = await docxConvert(file, target);
  } else {
    blob = await textConvert(file, target);
  }

  const filename = `${baseName}.${target === "jpg" ? "jpg" : target}`;
  return { blob, filename };
}

export function downloadBlob(blob: Blob, filename: string) {
  saveAs(blob, filename);
}