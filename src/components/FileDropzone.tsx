import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onFiles: (files: File[]) => void;
}

export const FileDropzone = ({ onFiles }: Props) => {
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
      onClick={() => inputRef.current?.click()}
      className={cn(
        "relative cursor-pointer rounded-2xl border-2 border-dashed bg-card/40 backdrop-blur-sm p-12 text-center transition-smooth",
        "hover:border-primary hover:bg-card/60",
        dragging
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-border"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary shadow-elegant animate-pulse-glow">
        <Upload className="h-7 w-7 text-primary-foreground" />
      </div>
      <h3 className="mb-2 text-xl font-semibold">
        Drop files here or <span className="text-gradient">browse</span>
      </h3>
      <p className="text-sm text-muted-foreground">
        PDF, JPG, PNG, WebP, DOCX, TXT, HTML, JSON, CSV and more
      </p>
    </div>
  );
};