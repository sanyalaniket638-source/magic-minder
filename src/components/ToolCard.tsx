import { Link } from "react-router-dom";
import type { Tool } from "@/lib/tools";

interface Props {
  tool: Tool;
}

export const ToolCard = ({ tool }: Props) => {
  const Icon = tool.icon;
  return (
    <Link
      to={`/tool/${tool.id}`}
      className="group relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 shadow-card transition-smooth hover:-translate-y-1 hover:border-primary/40 hover:shadow-hover"
    >
      <div className="flex items-center justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tool.bg}`}>
          <Icon className={`h-6 w-6 ${tool.color}`} />
        </div>
        {tool.badge && (
          <span className="rounded-full bg-gradient-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-elegant">
            {tool.badge}
          </span>
        )}
      </div>
      <div>
        <h3 className="text-lg font-semibold leading-tight transition-smooth group-hover:text-primary">
          {tool.title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
      </div>
    </Link>
  );
};