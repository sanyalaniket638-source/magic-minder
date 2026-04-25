import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Download,
  Loader2,
  X,
  Check,
} from "lucide-react";
import {
  convertFile,
  downloadBlob,
  FORMAT_LABELS,
  getCompatibleTargets,
  getExtension,
  TargetFormat,
} from "@/lib/converters";
import { toast } from "sonner";

interface Props {
  file: File;
  onRemove: () => void;
}

function fileIcon(name: string) {
  const ext = getExtension(name);
  if (["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(ext))
    return <ImageIcon className="h-5 w-5" />;
  if (ext === "pdf" || ext === "docx" || ext === "txt")
    return <FileText className="h-5 w-5" />;
  return <FileIcon className="h-5 w-5" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const ConversionItem = ({ file, onRemove }: Props) => {
  const targets = getCompatibleTargets(file.name);
  const [target, setTarget] = useState<TargetFormat>(targets[0]);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">(
    "idle"
  );
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(
    null
  );

  const handleConvert = async () => {
    setStatus("working");
    setResult(null);
    try {
      const out = await convertFile(file, target);
      setResult(out);
      setStatus("done");
      toast.success(`${file.name} converted`);
    } catch (e) {
      console.error(e);
      setStatus("error");
      toast.error(`Could not convert ${file.name}`);
    }
  };

  return (
    <div className="group flex flex-col gap-4 rounded-xl border border-border bg-card/60 p-4 shadow-card transition-smooth hover:border-primary/40 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          {fileIcon(file.name)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatSize(file.size)} · {getExtension(file.name).toUpperCase()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={target}
          onValueChange={(v) => setTarget(v as TargetFormat)}
          disabled={status === "working"}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {targets.map((t) => (
              <SelectItem key={t} value={t}>
                {FORMAT_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {status === "done" && result ? (
          <Button
            onClick={() => downloadBlob(result.blob, result.filename)}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90"
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        ) : (
          <Button
            onClick={handleConvert}
            disabled={status === "working"}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90"
          >
            {status === "working" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Converting
              </>
            ) : status === "error" ? (
              "Retry"
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Convert
              </>
            )}
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label="Remove file"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};