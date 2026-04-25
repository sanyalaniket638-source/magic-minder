import { useState } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { ConversionItem } from "@/components/ConversionItem";
import { Button } from "@/components/ui/button";
import { FileStack, Sparkles, ShieldCheck, Zap } from "lucide-react";

interface QueuedFile {
  id: string;
  file: File;
}

const Index = () => {
  const [files, setFiles] = useState<QueuedFile[]>([]);

  const addFiles = (incoming: File[]) => {
    setFiles((prev) => [
      ...prev,
      ...incoming.map((f) => ({
        id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 8)}`,
        file: f,
      })),
    ]);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 backdrop-blur-md sticky top-0 z-40 bg-background/70">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-elegant">
              <FileStack className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              PDF<span className="text-gradient">changer</span>
            </span>
          </div>
          <a
            href="#convert"
            className="text-sm text-muted-foreground hover:text-foreground transition-smooth"
          >
            Start converting
          </a>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="container py-20 text-center animate-fade-up">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            100% in-browser · Your files never leave this device
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl">
            Convert anything to{" "}
            <span className="text-gradient">anything</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Drop your PDFs, images, documents and text files. Pick a target
            format. Download in seconds.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-3xl mx-auto">
            {[
              { icon: Zap, title: "Instant", desc: "Conversions run locally — no upload waits." },
              { icon: ShieldCheck, title: "Private", desc: "Files never leave your browser." },
              { icon: FileStack, title: "Many formats", desc: "PDF, JPG, PNG, WebP, DOCX, TXT and more." },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-card/40 p-5 text-left shadow-card transition-smooth hover:border-primary/40"
              >
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Convert */}
        <section id="convert" className="container pb-24">
          <div className="mx-auto max-w-3xl">
            <FileDropzone onFiles={addFiles} />

            {files.length > 0 && (
              <div className="mt-8 space-y-3 animate-fade-up">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Queue ({files.length})
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFiles([])}
                  >
                    Clear all
                  </Button>
                </div>
                {files.map((q) => (
                  <ConversionItem
                    key={q.id}
                    file={q.file}
                    onRemove={() =>
                      setFiles((prev) => prev.filter((p) => p.id !== q.id))
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="container text-center text-sm text-muted-foreground">
          PDFchanger · All conversions happen on your device
        </div>
      </footer>
    </div>
  );
};

export default Index;
