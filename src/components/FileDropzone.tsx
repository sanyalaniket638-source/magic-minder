import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  title?: string;
  hint?: string;
}

export const FileDropzone = ({
  onFiles,
  accept,
  multiple = true,
  title = "Select or drop files",
  hint = "or drop them here",
}: Props) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      onFiles(Array.from(files));
    },
    [onFiles]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "relative rounded-2xl border-2 border-dashed bg-secondary/40 p-10 text-center transition-smooth",
        dragging
          ? "border-primary bg-primary/5"
          : "border-border"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-elegant transition-smooth hover:shadow-hover hover:scale-[1.02]"
      >
        <Upload className="h-5 w-5" />
        {title}
      </button>
      <p className="mt-4 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
};