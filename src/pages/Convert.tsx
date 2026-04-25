import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Loader2, FileCog } from "lucide-react";
import { saveAs } from "file-saver";
import { toast } from "sonner";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FileDropzone } from "@/components/FileDropzone";
import { FileList } from "@/components/FileList";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  anyToPdf,
  convertImage,
  jpgsToPdf,
  pdfToDocx,
  pdfToJpgs,
  pdfToPngs,
  pdfToText,
  wordToPdf,
} from "@/lib/pdfTools";

type Target = "pdf" | "jpg" | "png" | "webp" | "docx" | "txt";

const TARGETS: { value: Target; label: string }[] = [
  { value: "pdf", label: "PDF (.pdf)" },
  { value: "jpg", label: "JPG (.jpg)" },
  { value: "png", label: "PNG (.png)" },
  { value: "webp", label: "WebP (.webp)" },
  { value: "docx", label: "Word (.docx)" },
  { value: "txt", label: "Text (.txt)" },
];

type Result =
  | { kind: "single"; blob: Blob; filename: string }
  | { kind: "many"; items: { blob: Blob; name: string }[] };

function extOf(name: string) {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}
function baseOf(name: string) {
  return name.replace(/\.[^.]+$/, "");
}
function isImage(file: File) {
  if (file.type.startsWith("image/")) return true;
  return ["jpg", "jpeg", "png", "webp", "avif", "heic", "heif", "gif", "bmp"].includes(
    extOf(file.name)
  );
}
function isPdf(file: File) {
  return file.type === "application/pdf" || extOf(file.name) === "pdf";
}
function isDocx(file: File) {
  return (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extOf(file.name) === "docx"
  );
}

export default function Convert() {
  const [files, setFiles] = useState<File[]>([]);
  const [target, setTarget] = useState<Target>("pdf");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const onFiles = (incoming: File[]) => {
    setFiles((prev) => [...prev, ...incoming]);
    setResult(null);
  };
  const removeAt = (i: number) =>
    setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const canRun = files.length > 0 && !busy;

  const summary = useMemo(() => {
    if (files.length === 0) return "Upload one or more files to begin.";
    const exts = Array.from(new Set(files.map((f) => extOf(f.name) || "file")));
    return `${files.length} file${files.length > 1 ? "s" : ""} · ${exts.join(", ")} → ${target.toUpperCase()}`;
  }, [files, target]);

  const convertOne = async (
    file: File
  ): Promise<{ blob: Blob; name: string } | { items: { blob: Blob; name: string }[] }> => {
    const base = baseOf(file.name);

    // ---- Target: PDF ----
    if (target === "pdf") {
      if (isPdf(file)) return { blob: file, name: file.name };
      if (isImage(file)) {
        // Normalize odd image formats to JPG first, then wrap as PDF
        const ext = extOf(file.name);
        if (["heic", "heif", "avif"].includes(ext)) {
          const conv = await convertImage(file, "image/jpeg", 0.92);
          const f = new File([conv.blob], conv.name, { type: "image/jpeg" });
          const blob = await jpgsToPdf([f]);
          return { blob, name: `${base}.pdf` };
        }
        const blob = await jpgsToPdf([file]);
        return { blob, name: `${base}.pdf` };
      }
      if (isDocx(file)) {
        const blob = await wordToPdf(file);
        return { blob, name: `${base}.pdf` };
      }
      const blob = await anyToPdf([file]);
      return { blob, name: `${base}.pdf` };
    }

    // ---- Target: image (jpg / png / webp) ----
    if (target === "jpg" || target === "png" || target === "webp") {
      const mime =
        target === "jpg"
          ? "image/jpeg"
          : target === "png"
          ? "image/png"
          : "image/webp";
      if (isImage(file)) {
        const out = await convertImage(file, mime as any, 0.92);
        return { blob: out.blob, name: out.name };
      }
      if (isPdf(file)) {
        const items =
          target === "png" ? await pdfToPngs(file) : await pdfToJpgs(file);
        if (target === "webp") {
          // re-encode JPGs to WebP
          const reencoded: { blob: Blob; name: string }[] = [];
          for (const it of items) {
            const f = new File([it.blob], it.name, { type: "image/jpeg" });
            const out = await convertImage(f, "image/webp", 0.92);
            reencoded.push(out);
          }
          return { items: reencoded };
        }
        return { items };
      }
      throw new Error(`Can't convert "${file.name}" to ${target.toUpperCase()}.`);
    }

    // ---- Target: DOCX ----
    if (target === "docx") {
      if (isPdf(file)) {
        const blob = await pdfToDocx(file);
        return { blob, name: `${base}.docx` };
      }
      throw new Error(
        `DOCX export only supports PDF input right now. "${file.name}" is not a PDF.`
      );
    }

    // ---- Target: TXT ----
    if (target === "txt") {
      if (isPdf(file)) {
        const blob = await pdfToText(file);
        return { blob, name: `${base}.txt` };
      }
      if (isDocx(file)) {
        // Word → PDF → text
        const pdf = await wordToPdf(file);
        const blob = await pdfToText(
          new File([pdf], `${base}.pdf`, { type: "application/pdf" })
        );
        return { blob, name: `${base}.txt` };
      }
      throw new Error(`Can't extract text from "${file.name}".`);
    }

    throw new Error("Unsupported target format.");
  };

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const allItems: { blob: Blob; name: string }[] = [];
      for (const f of files) {
        const out = await convertOne(f);
        if ("items" in out) allItems.push(...out.items);
        else allItems.push(out);
      }
      if (allItems.length === 1) {
        setResult({ kind: "single", blob: allItems[0].blob, filename: allItems[0].name });
      } else {
        setResult({ kind: "many", items: allItems });
      }
      toast.success("Conversion complete!");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Conversion failed. Try a different file or format.");
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!result) return;
    if (result.kind === "single") saveAs(result.blob, result.filename);
    else result.items.forEach((it) => saveAs(it.blob, it.name));
  };

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
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <FileCog className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
            Universal File Converter
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Upload any file, pick the format you want, and download the result.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl space-y-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Upload For Conversion
          </h2>

          <FileDropzone
            onFiles={onFiles}
            accept="*/*"
            multiple
            title={files.length === 0 ? "Select files" : "Add more files"}
            hint="or drop here · any format"
          />

          {files.length > 0 && <FileList files={files} onRemove={removeAt} />}

          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <Label className="mb-2 block text-sm font-medium">Convert to</Label>
            <Select value={target} onValueChange={(v) => setTarget(v as Target)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TARGETS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">{summary}</p>
          </div>

          {!result ? (
            <Button
              size="lg"
              className="w-full"
              disabled={!canRun}
              onClick={run}
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Converting…
                </>
              ) : (
                <>Convert to {target.toUpperCase()}</>
              )}
            </Button>
          ) : (
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <p className="mb-3 text-sm font-medium">
                {result.kind === "single"
                  ? `Ready: ${result.filename}`
                  : `Ready: ${result.items.length} files`}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button size="lg" className="flex-1" onClick={download}>
                  <Download className="mr-2 h-4 w-4" /> Download
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    setResult(null);
                    setFiles([]);
                  }}
                >
                  Start over
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}