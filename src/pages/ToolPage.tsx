import { useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Download, Loader2, Sparkles } from "lucide-react";
import { saveAs } from "file-saver";
import { toast } from "sonner";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FileDropzone } from "@/components/FileDropzone";
import { FileList } from "@/components/FileList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

import { TOOLS_BY_ID, type ToolId } from "@/lib/tools";
import {
  compressPdf,
  jpgsToPdf,
  mergePdfs,
  pdfPageCount,
  pdfToJpgs,
  pdfToText,
  rotatePdf,
  splitPdf,
  wordToPdf,
  pdfToPngs,
  pdfToDocx,
  extractPdfImages,
  addPageNumbers,
  watermarkPdf,
  protectPdf,
  unlockPdf,
  repairPdf,
  convertImage,
  anyToPdf,
  type Position,
} from "@/lib/pdfTools";
import { callAi } from "@/lib/aiClient";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

type Result =
  | { kind: "single"; blob: Blob; filename: string }
  | { kind: "many"; items: { blob: Blob; name: string }[] }
  | { kind: "text"; text: string; filename: string };

export default function ToolPage() {
  const { toolId } = useParams<{ toolId: ToolId }>();
  const tool = toolId ? TOOLS_BY_ID[toolId as ToolId] : undefined;

  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  // Tool-specific options
  const [splitFrom, setSplitFrom] = useState(1);
  const [splitTo, setSplitTo] = useState(1);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [angle, setAngle] = useState<90 | 180 | 270>(90);
  const [quality, setQuality] = useState(60);
  const [password, setPassword] = useState("");
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [pageNumPos, setPageNumPos] = useState<Position>("bottom-center");
  const [imageTarget, setImageTarget] = useState<"image/jpeg" | "image/png" | "image/webp">(
    "image/jpeg"
  );
  const [language, setLanguage] = useState("English");

  const cta = useMemo(() => {
    switch (tool?.id) {
      case "merge-pdf": return "Merge PDF";
      case "split-pdf": return "Split PDF";
      case "compress-pdf": return "Compress PDF";
      case "pdf-to-jpg": return "Convert to JPG";
      case "jpg-to-pdf": return "Convert to PDF";
      case "word-to-pdf": return "Convert to PDF";
      case "rotate-pdf": return "Rotate PDF";
      case "pdf-to-text": return "Extract text";
      case "pdf-to-docx": return "Convert to DOCX";
      case "pdf-to-png": return "Convert to PNG";
      case "page-numbers": return "Add page numbers";
      case "watermark-pdf": return "Add watermark";
      case "protect-pdf": return "Protect PDF";
      case "unlock-pdf": return "Unlock PDF";
      case "repair-pdf": return "Repair PDF";
      case "extract-images": return "Extract images";
      case "ocr-pdf": return "Run OCR";
      case "heic-to-jpg": return "Convert to JPG";
      case "avif-to-jpg": return "Convert to JPG";
      case "image-convert": return "Convert images";
      case "any-to-pdf": return "Convert to PDF";
      case "ai-summarize": return "Summarize with AI";
      case "ai-translate": return "Translate with AI";
      default: return "Run";
    }
  }, [tool?.id]);

  if (!tool) return <Navigate to="/" replace />;

  const onFiles = async (incoming: File[]) => {
    const next = tool.multiple ? [...files, ...incoming] : incoming.slice(0, 1);
    setFiles(next);
    setResult(null);
    if (tool.id === "split-pdf" && next[0]) {
      try {
        const c = await pdfPageCount(next[0]);
        setPageCount(c);
        setSplitFrom(1);
        setSplitTo(c);
      } catch {
        setPageCount(null);
      }
    }
  };

  const removeAt = (i: number) =>
    setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const moveAt = (from: number, to: number) =>
    setFiles((prev) => {
      const next = [...prev];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });

  const minNeeded = tool.id === "merge-pdf" ? 2 : 1;
  const canRun = files.length >= minNeeded && !busy;

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const baseName =
        files[0]?.name.replace(/\.[^.]+$/, "") || "pdfchanger";
      switch (tool.id) {
        case "merge-pdf": {
          const blob = await mergePdfs(files);
          setResult({ kind: "single", blob, filename: "merged.pdf" });
          break;
        }
        case "split-pdf": {
          const blob = await splitPdf(files[0], { from: splitFrom, to: splitTo });
          setResult({
            kind: "single",
            blob,
            filename: `${baseName}-pages-${splitFrom}-${splitTo}.pdf`,
          });
          break;
        }
        case "compress-pdf": {
          const blob = await compressPdf(files[0], quality / 100);
          setResult({
            kind: "single",
            blob,
            filename: `${baseName}-compressed.pdf`,
          });
          break;
        }
        case "pdf-to-jpg": {
          const items = await pdfToJpgs(files[0]);
          setResult({ kind: "many", items });
          break;
        }
        case "jpg-to-pdf": {
          const blob = await jpgsToPdf(files);
          setResult({ kind: "single", blob, filename: "images.pdf" });
          break;
        }
        case "word-to-pdf": {
          const blob = await wordToPdf(files[0]);
          setResult({ kind: "single", blob, filename: `${baseName}.pdf` });
          break;
        }
        case "rotate-pdf": {
          const blob = await rotatePdf(files[0], angle);
          setResult({
            kind: "single",
            blob,
            filename: `${baseName}-rotated.pdf`,
          });
          break;
        }
        case "pdf-to-text": {
          const blob = await pdfToText(files[0]);
          setResult({ kind: "single", blob, filename: `${baseName}.txt` });
          break;
        }
        case "pdf-to-docx": {
          const blob = await pdfToDocx(files[0]);
          setResult({ kind: "single", blob, filename: `${baseName}.docx` });
          break;
        }
        case "pdf-to-png": {
          const items = await pdfToPngs(files[0]);
          setResult({ kind: "many", items });
          break;
        }
        case "page-numbers": {
          const blob = await addPageNumbers(files[0], pageNumPos);
          setResult({ kind: "single", blob, filename: `${baseName}-numbered.pdf` });
          break;
        }
        case "watermark-pdf": {
          const blob = await watermarkPdf(files[0], watermarkText || "WATERMARK");
          setResult({ kind: "single", blob, filename: `${baseName}-watermarked.pdf` });
          break;
        }
        case "protect-pdf": {
          if (!password) throw new Error("Please choose a password");
          const blob = await protectPdf(files[0], password);
          setResult({ kind: "single", blob, filename: `${baseName}-protected.pdf` });
          break;
        }
        case "unlock-pdf": {
          const blob = await unlockPdf(files[0], password);
          setResult({ kind: "single", blob, filename: `${baseName}-unlocked.pdf` });
          break;
        }
        case "repair-pdf": {
          const blob = await repairPdf(files[0]);
          setResult({ kind: "single", blob, filename: `${baseName}-repaired.pdf` });
          break;
        }
        case "extract-images": {
          const items = await extractPdfImages(files[0]);
          setResult({ kind: "many", items });
          break;
        }
        case "heic-to-jpg":
        case "avif-to-jpg": {
          const items: { blob: Blob; name: string }[] = [];
          for (const f of files) items.push(await convertImage(f, "image/jpeg", 0.92));
          setResult({ kind: "many", items });
          break;
        }
        case "image-convert": {
          const items: { blob: Blob; name: string }[] = [];
          for (const f of files) items.push(await convertImage(f, imageTarget, 0.92));
          setResult({ kind: "many", items });
          break;
        }
        case "any-to-pdf": {
          const blob = await anyToPdf(files);
          setResult({ kind: "single", blob, filename: "converted.pdf" });
          break;
        }
        case "ai-summarize": {
          const txtBlob = await pdfToText(files[0]);
          const text = await txtBlob.text();
          if (!text.trim()) throw new Error("Couldn't read any text from this PDF.");
          const summary = await callAi({ mode: "summarize", text });
          setResult({ kind: "text", text: summary, filename: `${baseName}-summary.txt` });
          break;
        }
        case "ai-translate": {
          const txtBlob = await pdfToText(files[0]);
          const text = await txtBlob.text();
          if (!text.trim()) throw new Error("Couldn't read any text from this PDF.");
          const translated = await callAi({ mode: "translate", text, language });
          setResult({
            kind: "text",
            text: translated,
            filename: `${baseName}-${language.toLowerCase()}.txt`,
          });
          break;
        }
        case "ocr-pdf": {
          const pages = await pdfToJpgs(files[0]);
          const images: string[] = [];
          for (const p of pages.slice(0, 8)) {
            images.push(await blobToDataUrl(p.blob));
          }
          const text = await callAi({ mode: "ocr", images });
          setResult({ kind: "text", text, filename: `${baseName}-ocr.txt` });
          break;
        }
      }
      toast.success("Done!");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Something went wrong. Please try a different file.");
    } finally {
      setBusy(false);
    }
  };

  const downloadResult = () => {
    if (!result) return;
    if (result.kind === "single") {
      saveAs(result.blob, result.filename);
    } else if (result.kind === "many") {
      result.items.forEach((it) => saveAs(it.blob, it.name));
    } else {
      saveAs(new Blob([result.text], { type: "text/plain" }), result.filename);
    }
  };

  const Icon = tool.icon;

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      <main className="container py-12">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-smooth hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All tools
        </Link>

        <div className="text-center">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${tool.bg}`}
          >
            <Icon className={`h-8 w-8 ${tool.color}`} />
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
            {tool.title}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {tool.description}
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl space-y-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Upload For Conversion
          </h2>
          <FileDropzone
            onFiles={onFiles}
            accept={tool.accept}
            multiple={tool.multiple}
            title={
              files.length === 0
                ? `Select ${tool.multiple ? "files" : "file"}`
                : `Add more ${tool.multiple ? "files" : "file"}`
            }
            hint="or drop here"
          />

          {files.length > 0 && (
            <FileList
              files={files}
              onRemove={removeAt}
              onMove={tool.id === "merge-pdf" ? moveAt : undefined}
            />
          )}

          {/* Tool-specific options */}
          {files.length > 0 && tool.id === "split-pdf" && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <p className="mb-3 text-sm font-medium">
                Page range
                {pageCount ? (
                  <span className="text-muted-foreground"> · {pageCount} pages total</span>
                ) : null}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="from" className="text-xs">From</Label>
                  <Input
                    id="from"
                    type="number"
                    min={1}
                    max={pageCount ?? undefined}
                    value={splitFrom}
                    onChange={(e) => setSplitFrom(parseInt(e.target.value || "1"))}
                  />
                </div>
                <div>
                  <Label htmlFor="to" className="text-xs">To</Label>
                  <Input
                    id="to"
                    type="number"
                    min={1}
                    max={pageCount ?? undefined}
                    value={splitTo}
                    onChange={(e) => setSplitTo(parseInt(e.target.value || "1"))}
                  />
                </div>
              </div>
            </div>
          )}

          {files.length > 0 && tool.id === "rotate-pdf" && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <Label className="mb-2 block text-sm font-medium">
                Rotation angle
              </Label>
              <Select
                value={String(angle)}
                onValueChange={(v) => setAngle(parseInt(v) as 90 | 180 | 270)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="90">90° clockwise</SelectItem>
                  <SelectItem value="180">180°</SelectItem>
                  <SelectItem value="270">270° (90° counter-clockwise)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {files.length > 0 && tool.id === "compress-pdf" && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Quality
                </Label>
                <span className="text-sm text-muted-foreground">{quality}%</span>
              </div>
              <Slider
                value={[quality]}
                min={20}
                max={90}
                step={5}
                onValueChange={(v) => setQuality(v[0])}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Lower quality = smaller file. 60% is a good balance.
              </p>
            </div>
          )}

          {files.length > 0 && tool.id === "page-numbers" && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <Label className="mb-2 block text-sm font-medium">Position</Label>
              <Select value={pageNumPos} onValueChange={(v) => setPageNumPos(v as Position)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-center">Bottom · Center</SelectItem>
                  <SelectItem value="bottom-right">Bottom · Right</SelectItem>
                  <SelectItem value="top-center">Top · Center</SelectItem>
                  <SelectItem value="top-right">Top · Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {files.length > 0 && tool.id === "watermark-pdf" && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <Label htmlFor="wm" className="mb-2 block text-sm font-medium">Watermark text</Label>
              <Input
                id="wm"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="CONFIDENTIAL"
              />
            </div>
          )}

          {files.length > 0 && (tool.id === "protect-pdf" || tool.id === "unlock-pdf") && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <Label htmlFor="pw" className="mb-2 block text-sm font-medium">
                {tool.id === "protect-pdf" ? "Choose a password" : "Current password"}
              </Label>
              <Input
                id="pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              {tool.id === "protect-pdf" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  The original file is embedded inside a wrapper PDF. The password
                  is required to extract it from a desktop reader.
                </p>
              )}
            </div>
          )}

          {files.length > 0 && tool.id === "image-convert" && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <Label className="mb-2 block text-sm font-medium">Target format</Label>
              <Select value={imageTarget} onValueChange={(v) => setImageTarget(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image/jpeg">JPG</SelectItem>
                  <SelectItem value="image/png">PNG</SelectItem>
                  <SelectItem value="image/webp">WebP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {files.length > 0 && tool.id === "ai-translate" && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <Label htmlFor="lang" className="mb-2 block text-sm font-medium">Translate into</Label>
              <Input
                id="lang"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="English, Hindi, Spanish, French…"
              />
            </div>
          )}

          {result?.kind === "text" && (
            <div className="max-h-80 overflow-auto rounded-xl border border-border bg-card p-5 text-sm shadow-card whitespace-pre-wrap">
              {result.text}
            </div>
          )}

          {/* Action */}
          <div className="sticky bottom-4 z-10">
            {!result ? (
              <Button
                onClick={run}
                disabled={!canRun}
                className="h-14 w-full rounded-xl bg-gradient-primary text-base font-semibold text-primary-foreground shadow-elegant transition-smooth hover:shadow-hover disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Working…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    {cta}
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={downloadResult}
                className="h-14 w-full rounded-xl bg-gradient-primary text-base font-semibold text-primary-foreground shadow-elegant transition-smooth hover:shadow-hover"
              >
                <Download className="mr-2 h-5 w-5" />
                {result.kind === "many"
                  ? `Download ${result.items.length} files`
                  : "Download"}
              </Button>
            )}
            {files.length > 0 && minNeeded === 2 && files.length < 2 && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Add at least 2 PDFs to merge.
              </p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}