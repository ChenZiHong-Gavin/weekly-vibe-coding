import { motion } from "framer-motion";
import { PSEUDOCODE_LINES } from "./types";

interface Props {
  highlightLine: number;
}

export default function CodePanel({ highlightLine }: Props) {
  return (
    <div className="font-mono text-base leading-loose">
      {PSEUDOCODE_LINES.map((line, index) => {
        const isActive = index === highlightLine;
        const indent = line.match(/^(\s*)/)?.[1]?.length ?? 0;

        return (
          <motion.div
            key={index}
            className="relative px-5 py-2 rounded-md flex items-center gap-4"
            animate={{
              backgroundColor: isActive
                ? "rgba(212, 165, 116, 0.15)"
                : "transparent",
              x: isActive ? 4 : 0,
            }}
            transition={{ duration: 0.3 }}
          >
            {/* Line number */}
            <span
              className="w-7 text-right text-sm flex-shrink-0 tabular-nums"
              style={{ color: isActive ? "#d4a574" : "#4a5568" }}
            >
              {index + 1}
            </span>

            {/* Active indicator */}
            {isActive && (
              <motion.div
                className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full"
                style={{ backgroundColor: "#d4a574" }}
                layoutId="activeLine"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}

            {/* Code text */}
            <span
              style={{
                paddingLeft: `${indent * 4}px`,
                color: isActive ? "#fffffe" : "#a7a9be",
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {renderCodeLine(line.trimStart(), isActive)}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

function renderCodeLine(code: string, _isActive: boolean) {
  // Simple syntax highlighting
  const keywords = [
    "function",
    "for",
    "if",
    "else",
    "return",
    "down to",
    "break",
  ];
  const parts: { text: string; type: string }[] = [];

  // Handle comments
  const commentIdx = code.indexOf("//");
  const mainCode = commentIdx >= 0 ? code.slice(0, commentIdx) : code;
  const comment = commentIdx >= 0 ? code.slice(commentIdx) : "";

  let remaining = mainCode;
  while (remaining.length > 0) {
    let earliestMatch: { index: number; keyword: string } | null = null;

    for (const kw of keywords) {
      const idx = remaining.indexOf(kw);
      if (idx !== -1 && (!earliestMatch || idx < earliestMatch.index)) {
        earliestMatch = { index: idx, keyword: kw };
      }
    }

    if (earliestMatch) {
      if (earliestMatch.index > 0) {
        parts.push({
          text: remaining.slice(0, earliestMatch.index),
          type: "normal",
        });
      }
      parts.push({ text: earliestMatch.keyword, type: "keyword" });
      remaining = remaining.slice(
        earliestMatch.index + earliestMatch.keyword.length
      );
    } else {
      parts.push({ text: remaining, type: "normal" });
      remaining = "";
    }
  }

  if (comment) {
    parts.push({ text: comment, type: "comment" });
  }

  const colorMap: Record<string, string> = {
    keyword: "#c792ea",
    comment: "#6a737d",
    normal: "inherit",
  };

  return (
    <span>
      {parts.map((p, i) => (
        <span key={i} style={{ color: colorMap[p.type] || "inherit" }}>
          {p.text}
        </span>
      ))}
    </span>
  );
}
