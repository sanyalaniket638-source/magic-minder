import {
  Combine,
  Scissors,
  Minimize2,
  FileImage,
  ImageDown,
  FileText,
  RotateCw,
  FileType2,
  type LucideIcon,
} from "lucide-react";

export type ToolId =
  | "merge-pdf"
  | "split-pdf"
  | "compress-pdf"
  | "pdf-to-jpg"
  | "jpg-to-pdf"
  | "word-to-pdf"
  | "rotate-pdf"
  | "pdf-to-text";

export interface Tool {
  id: ToolId;
  title: string;
  short: string;
  description: string;
  icon: LucideIcon;
  color: string; // tailwind text color class
  bg: string; // tailwind bg color class
  accept: string;
  multiple: boolean;
}

export const TOOLS: Tool[] = [
  {
    id: "merge-pdf",
    title: "Merge PDF",
    short: "Combine PDFs",
    description:
      "Combine multiple PDFs into a single document in the order you choose.",
    icon: Combine,
    color: "text-rose-600",
    bg: "bg-rose-50",
    accept: "application/pdf",
    multiple: true,
  },
  {
    id: "split-pdf",
    title: "Split PDF",
    short: "Extract pages",
    description: "Extract one page or a range of pages from a PDF.",
    icon: Scissors,
    color: "text-amber-600",
    bg: "bg-amber-50",
    accept: "application/pdf",
    multiple: false,
  },
  {
    id: "compress-pdf",
    title: "Compress PDF",
    short: "Reduce file size",
    description: "Reduce PDF file size while keeping the best quality possible.",
    icon: Minimize2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    accept: "application/pdf",
    multiple: false,
  },
  {
    id: "pdf-to-jpg",
    title: "PDF to JPG",
    short: "Convert pages",
    description: "Convert each page of a PDF into a high-quality JPG image.",
    icon: ImageDown,
    color: "text-sky-600",
    bg: "bg-sky-50",
    accept: "application/pdf",
    multiple: false,
  },
  {
    id: "jpg-to-pdf",
    title: "JPG to PDF",
    short: "Images → PDF",
    description: "Convert JPG, PNG or WebP images into a single PDF document.",
    icon: FileImage,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    accept: "image/jpeg,image/png,image/webp",
    multiple: true,
  },
  {
    id: "word-to-pdf",
    title: "Word to PDF",
    short: "DOCX → PDF",
    description: "Convert a DOCX document into a clean PDF, right in your browser.",
    icon: FileType2,
    color: "text-blue-600",
    bg: "bg-blue-50",
    accept:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    multiple: false,
  },
  {
    id: "rotate-pdf",
    title: "Rotate PDF",
    short: "Turn pages",
    description: "Rotate all pages of a PDF by 90, 180 or 270 degrees.",
    icon: RotateCw,
    color: "text-fuchsia-600",
    bg: "bg-fuchsia-50",
    accept: "application/pdf",
    multiple: false,
  },
  {
    id: "pdf-to-text",
    title: "PDF to Text",
    short: "Extract text",
    description: "Extract all readable text from a PDF into a .txt file.",
    icon: FileText,
    color: "text-teal-600",
    bg: "bg-teal-50",
    accept: "application/pdf",
    multiple: false,
  },
];

export const TOOLS_BY_ID: Record<ToolId, Tool> = TOOLS.reduce(
  (acc, t) => ({ ...acc, [t.id]: t }),
  {} as Record<ToolId, Tool>
);