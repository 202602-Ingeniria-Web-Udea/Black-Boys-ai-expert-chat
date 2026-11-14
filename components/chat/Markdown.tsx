"use client";

import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import kotlin from "highlight.js/lib/languages/kotlin";
import markdown from "highlight.js/lib/languages/markdown";
import php from "highlight.js/lib/languages/php";
import python from "highlight.js/lib/languages/python";
import ruby from "highlight.js/lib/languages/ruby";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import swift from "highlight.js/lib/languages/swift";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import { Check, Copy, Info, Lightbulb, Siren, TriangleAlert } from "lucide-react";
import { Children, isValidElement, memo, useState, type ComponentProps, type ReactElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { cn } from "@/components/ui/cn";
import { copyText } from "@/lib/client/api";

type MarkdownProps = ComponentProps<typeof ReactMarkdown>;

const rehypePlugins: MarkdownProps["rehypePlugins"] = [
  [
    rehypeHighlight,
    {
      detect: false,
      plainText: ["text", "txt", "plaintext", "plain"],
      languages: {
        bash, c, cpp, csharp, css, diff, dockerfile, go, java, javascript, json, kotlin,
        markdown, php, python, ruby, rust, sql, swift, typescript, xml, yaml,
      },
    },
  ],
];
const remarkPlugins: MarkdownProps["remarkPlugins"] = [remarkGfm];

function nodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement(node)) return nodeText((node.props as { children?: ReactNode }).children);
  return "";
}

export function CopyButton({ text, label = "Copiar", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (await copyText(text)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-200/70 hover:text-slate-900",
        className,
      )}
      aria-label={copied ? "Copiado" : label}
    >
      {copied ? <Check className="size-3.5 text-brand-600" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      {copied ? "Copiado" : label}
    </button>
  );
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const first = Children.toArray(children)[0];
  const element = isValidElement(first) ? (first as ReactElement<{ className?: string; children?: ReactNode }>) : null;
  const className = element?.props.className ?? "";
  const language = /language-([\w+#-]+)/.exec(className)?.[1] ?? "";
  const inner = element?.props.children ?? children;
  const text = nodeText(inner).replace(/\n$/, "");

  return (
    <div className="code-block">
      <div className="code-block-head">
        <span>{language || "código"}</span>
        <CopyButton text={text} label="Copiar código" />
      </div>
      <pre>
        <code className={className}>{inner}</code>
      </pre>
    </div>
  );
}

/** Avisos que el asistente escribe como cita: > **Atención:** … (también Urgente, Consejo e Importante). */
const CALLOUTS: Record<string, { className: string; label: string; Icon: typeof Info }> = {
  atencion: { className: "callout-warn", label: "Atención", Icon: TriangleAlert },
  urgente: { className: "callout-urgent", label: "Urgente", Icon: Siren },
  consejo: { className: "callout-tip", label: "Consejo", Icon: Lightbulb },
  importante: { className: "callout-info", label: "Importante", Icon: Info },
};

function calloutKey(label: string): string {
  return label
    .replace(/[:：]\s*$/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function Blockquote({ children }: { children?: ReactNode }) {
  const blocks = Children.toArray(children);
  const firstIndex = blocks.findIndex((block) => isValidElement(block));
  const first = blocks[firstIndex];
  if (isValidElement(first) && first.type === "p") {
    const inner = Children.toArray((first.props as { children?: ReactNode }).children);
    const head = inner[0];
    if (isValidElement(head) && head.type === "strong") {
      const callout = CALLOUTS[calloutKey(nodeText(head))];
      if (callout) {
        const rest = inner.slice(1);
        if (typeof rest[0] === "string") {
          const text = rest[0].replace(/^[:：]?\s*/, "");
          rest[0] = text.charAt(0).toLocaleUpperCase("es") + text.slice(1);
        }
        const others = blocks.filter((_, index) => index !== firstIndex);
        const hasText = rest.some((part) => nodeText(part).trim() !== "");
        return (
          <div role="note" className={cn("callout", callout.className)}>
            <callout.Icon className="size-[1.1em]" aria-hidden="true" />
            <div>
              <span className="callout-title">{callout.label}</span>
              {hasText ? <p>{rest}</p> : null}
              {others}
            </div>
          </div>
        );
      }
    }
  }
  return <blockquote>{children}</blockquote>;
}

const components: Components = {
  blockquote: ({ children }) => <Blockquote>{children}</Blockquote>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  table: ({ children }) => (
    <div className="table-wrap">
      <table>{children}</table>
    </div>
  ),
};

/** Renderiza la respuesta del asistente (Markdown + tablas + código con resaltado). No interpreta HTML crudo. */
export const Markdown = memo(function Markdown({ content, streaming = false }: { content: string; streaming?: boolean }) {
  return (
    <div className={cn("md", streaming && "is-streaming")}>
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
});
