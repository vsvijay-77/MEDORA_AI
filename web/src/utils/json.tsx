import { Fragment, type ReactNode } from "react";

/** Tiny dependency-free JSON syntax highlighter → React nodes. */
export function highlightJson(value: unknown): ReactNode[] {
  const text = JSON.stringify(value, null, 2) ?? "";
  const re = /("(?:\\.|[^"\\])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push(<Fragment key={i++}>{text.slice(last, m.index)}</Fragment>);
    const tok = m[0];
    const kind = m[2] ? "key" : tok.startsWith('"') ? "string" : /true|false/.test(tok) ? "bool" : tok === "null" ? "null" : "number";
    out.push(<span key={i++} data-token={kind} className={`json-${kind}`}>{tok}</span>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(<Fragment key={i++}>{text.slice(last)}</Fragment>);
  return out;
}
