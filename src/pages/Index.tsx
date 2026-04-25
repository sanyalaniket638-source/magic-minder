import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ToolCard } from "@/components/ToolCard";
import { TOOLS, CATEGORIES } from "@/lib/tools";
import { ShieldCheck, Zap, FileStack, Sparkles } from "lucide-react";

const Index = () => (
  <div className="min-h-screen bg-gradient-hero">
    <Header />
    <main>
      {/* Hero */}
      <section className="container py-16 text-center animate-fade-up sm:py-24">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-card">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          100% in your browser · Files never leave this device
        </div>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Every tool you need to work with{" "}
          <span className="text-gradient">PDFs</span> in one place
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          Merge, split, compress, convert, rotate and more — all online and
          completely free. No upload, no wait. Pick a tool and start in seconds.
        </p>
      </section>

      {/* Tools grouped by category */}
      <section className="container space-y-12 pb-16">
        {CATEGORIES.map((cat) => {
          const items = TOOLS.filter((t) => t.category === cat);
          if (items.length === 0) return null;
          return (
            <div key={cat}>
              <h2 className="mb-5 text-xl font-bold tracking-tight">{cat}</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((t) => (
                  <ToolCard key={t.id} tool={t} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* Trust strip */}
      <section className="border-t border-border bg-card/50">
        <div className="container grid grid-cols-1 gap-6 py-12 sm:grid-cols-3">
          {[
            { icon: Zap, title: "Lightning fast", desc: "Tools run locally — no server round-trips." },
            { icon: ShieldCheck, title: "Private by design", desc: "Your files never leave the browser." },
            { icon: FileStack, title: "All the essentials", desc: "Merge, split, compress, convert and rotate." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

export default Index;
