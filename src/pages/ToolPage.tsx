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
} from "@/lib/pdfTools";

type Result =
  | { kind: "single"; blob: Blob; filename: string }
  | { kind: "many"; items: { blob: Blob; name: string }[] };

export default function ToolPage() {
  const { toolId } = useParams<{ toolId: ToolId }>();
  const tool = toolId ? TOOLS_BY_ID[toolId as ToolId] : undefined;

  if (!tool) return <Navigate to="/" replace />;

  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  // Tool-specific options
  const [splitFrom, setSplitFrom] = useState(1);
  const [splitTo, setSplitTo] = useState(1);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [angle, setAngle] = useState<90 | 180 | 270>(90);
  const [quality, setQuality] = useState(60);

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

  const cta = useMemo(() => {
    switch (tool.id) {
      case "merge-pdf":
        return "Merge PDF";
      case "split-pdf":
        return "Split PDF";
      case "compress-pdf":
        return "Compress PDF";
      case "pdf-to-jpg":
        return "Convert to JPG";
      case "jpg-to-pdf":
        return "Convert to PDF";
      case "word-to-pdf":
        return "Convert to PDF";
      case "rotate-pdf":
        return "Rotate PDF";
      case "pdf-to-text":
        return "Extract text";
    }
  }, [tool.id]);

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
      }
      toast.success("Done!");
    } catch (e) {
      console.error(e);
      toast.error("Something went wrong. Please try a different file.");
    } finally {
      setBusy(false);
    }
  };

  const downloadResult = () => {
    if (!result) return;
    if (result.kind === "single") {
      saveAs(result.blob, result.filename);
    } else {
      result.items.forEach((it) => saveAs(it.blob, it.name));
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