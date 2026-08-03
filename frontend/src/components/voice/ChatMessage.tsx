"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { ChatEntry } from "@/hooks/useChatSession";

interface Props {
  entry: ChatEntry;
}

export function ChatMessage({ entry }: Props) {
  const isUser = entry.role === "user";

  const sourceMatch = entry.content.match(/[\n\r]*Source:\s*([\s\S]+)$/);
  const bodyText = sourceMatch
    ? entry.content.slice(0, entry.content.length - sourceMatch[0].length).trim()
    : entry.content;
  const citationLabel = sourceMatch
    ? sourceMatch[1].trim()
    : (entry.dataVersion ?? null);

  return (
    <div className={`mb-3 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
          isUser ? "rounded-br-sm text-white" : "rounded-bl-sm border text-ra-ink"
        }`}
        style={
          isUser
            ? { background: "var(--ra-accent)" }
            : { background: "var(--ra-card)", borderColor: "var(--ra-line)" }
        }
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{bodyText}</p>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <p className="mb-1.5 last:mb-0">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-ra-navy">{children}</strong>
                ),
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => (
                  <ul className="my-1.5 ml-4 list-disc space-y-0.5">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-1.5 ml-4 list-decimal space-y-0.5">{children}</ol>
                ),
                li: ({ children }) => <li className="leading-snug">{children}</li>,
                h1: ({ children }) => (
                  <h1 className="mb-1 mt-2 text-base font-semibold text-ra-navy">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mb-1 mt-2 text-sm font-semibold text-ra-navy">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mb-1 mt-1.5 text-sm font-medium text-ra-navy">
                    {children}
                  </h3>
                ),
                code: ({ children }) => (
                  <code
                    className="rounded px-1 py-0.5 font-mono text-xs"
                    style={{ background: "var(--ra-bg)", color: "var(--ra-navy)" }}
                  >
                    {children}
                  </code>
                ),
                hr: () => (
                  <hr className="my-2" style={{ borderColor: "var(--ra-line)" }} />
                ),
              }}
            >
              {bodyText}
            </ReactMarkdown>
          </div>
        )}

        {!isUser && citationLabel && (
          <span
            className="mt-2 inline-block rounded px-2 py-0.5 text-[10px] font-medium"
            style={{
              background: "var(--ra-navy-900)",
              color: "var(--ra-hero-data-color)",
            }}
          >
            {citationLabel}
          </span>
        )}
      </div>
    </div>
  );
}
