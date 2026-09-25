"use client";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function renderInline(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, "<code class='rounded bg-secondary/50 px-1 py-0.5 text-[0.85em]'>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, label: string, url: string) => {
      if (!isSafeUrl(url)) return label;
      return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="text-adtraxio-accent underline-offset-2 hover:underline">${escapeHtml(label)}</a>`;
    }
  );
  return out;
}

export function SafeMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let orderedItems: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let tableRows: string[][] = [];

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="my-2 list-disc space-y-1 pl-5">
          {listItems.map((item, i) => (
            <li
              key={i}
              className="break-words text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderInline(item) }}
            />
          ))}
        </ul>
      );
      listItems = [];
    }
    if (orderedItems.length > 0) {
      elements.push(
        <ol key={`ol-${elements.length}`} className="my-2 list-decimal space-y-1 pl-5">
          {orderedItems.map((item, i) => (
            <li
              key={i}
              className="break-words text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderInline(item) }}
            />
          ))}
        </ol>
      );
      orderedItems = [];
    }
  }

  function flushTable() {
    if (tableRows.length === 0) return;
    const [header, ...rows] = tableRows;
    elements.push(
      <div
        key={`table-${elements.length}`}
        className="my-3 max-w-full overflow-x-auto rounded-md border border-border/50"
      >
        <table className="w-full min-w-[280px] text-left text-xs">
          <thead>
            <tr className="border-b border-border/50 bg-secondary/20">
              {header.map((cell, i) => (
                <th key={i} className="px-3 py-2 font-medium text-muted-foreground">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border/30 last:border-0">
                {row.map((cell, ci) => (
                  <td key={ci} className="break-words px-3 py-2 text-foreground/90">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
  }

  for (const line of lines) {
    if (line.startsWith("```")) {
      flushList();
      flushTable();
      if (inCode) {
        elements.push(
          <pre
            key={`code-${elements.length}`}
            className="my-2 max-w-full overflow-x-auto rounded-md border border-border/60 bg-secondary/30 p-3 text-xs"
          >
            <code className="break-words whitespace-pre-wrap">{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (line.includes("|") && line.trim().startsWith("|")) {
      flushList();
      const cells = line
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      if (cells.every((c) => /^[-:]+$/.test(c))) continue;
      tableRows.push(cells);
      continue;
    }
    flushTable();

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      const text = heading[2];
      const className =
        level === 1
          ? "mt-3 break-words text-base font-semibold"
          : level === 2
            ? "mt-2 break-words text-sm font-semibold"
            : "mt-2 break-words text-sm font-medium";
      elements.push(
        <p
          key={`h-${elements.length}`}
          className={className}
          dangerouslySetInnerHTML={{ __html: renderInline(text) }}
        />
      );
      continue;
    }

    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      listItems.push(listMatch[1]);
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      orderedItems.push(orderedMatch[1]);
      continue;
    }

    flushList();

    if (!line.trim()) {
      elements.push(<div key={`sp-${elements.length}`} className="h-2" />);
      continue;
    }

    elements.push(
      <p
        key={`p-${elements.length}`}
        className="break-words text-sm leading-relaxed text-foreground/90"
        dangerouslySetInnerHTML={{ __html: renderInline(line) }}
      />
    );
  }

  flushList();
  flushTable();

  if (inCode && codeLines.length > 0) {
    elements.push(
      <pre
        key="code-end"
        className="my-2 max-w-full overflow-x-auto rounded-md border border-border/60 bg-secondary/30 p-3 text-xs"
      >
        <code className="break-words whitespace-pre-wrap">{codeLines.join("\n")}</code>
      </pre>
    );
  }

  return (
    <div className="max-w-full min-w-0 space-y-0.5 break-words [overflow-wrap:anywhere]">
      {elements}
    </div>
  );
}
