import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders a stage artifact as a real document (headings, bold, tables,
 * blockquotes) rather than raw preformatted text — matches the "Live concept
 * doc" panel in the reference screenshots.
 */
export function MarkdownDoc({ content }: { content: string }) {
  return (
    <div className="prose-invert max-w-none text-sm leading-relaxed text-white/80">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => <h1 className="mb-3 text-2xl font-semibold text-white" {...props} />,
          h2: (props) => <h2 className="mb-2 mt-6 text-base font-semibold text-white/90" {...props} />,
          h3: (props) => <h3 className="mb-2 mt-4 text-sm font-semibold text-white/90" {...props} />,
          p: (props) => <p className="mb-3 text-white/70" {...props} />,
          strong: (props) => <strong className="font-semibold text-white" {...props} />,
          blockquote: (props) => (
            <blockquote className="mb-4 border-l-2 border-accent/60 pl-3 italic text-white/50" {...props} />
          ),
          ul: (props) => <ul className="mb-3 list-disc space-y-1 pl-5 text-white/70" {...props} />,
          ol: (props) => <ol className="mb-3 list-decimal space-y-1 pl-5 text-white/70" {...props} />,
          li: (props) => <li {...props} />,
          hr: () => <hr className="my-4 border-border" />,
          code: (props) => <code className="rounded bg-black/40 px-1 py-0.5 text-xs text-emerald-300" {...props} />,
          pre: (props) => (
            <pre className="mb-3 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-white/70" {...props} />
          ),
          table: (props) => (
            <div className="mb-4 overflow-auto">
              <table className="w-full border-collapse text-left text-xs" {...props} />
            </div>
          ),
          thead: (props) => <thead className="border-b border-border text-white/50" {...props} />,
          th: (props) => <th className="px-3 py-2 font-medium" {...props} />,
          td: (props) => <td className="border-t border-border/60 px-3 py-2 text-white/70" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
