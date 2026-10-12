import type { ReactNode } from 'react'

// Turn bare URLs in entry copy into tappable links (e.g. the alumni group on
// Day 9). Author-controlled content, so this is plain rendering, not user input.
const URL_RE = /(https?:\/\/[^\s]+)/g
export function linkify(text: string) {
  return text.split(URL_RE).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a>
    ) : (
      part
    ),
  )
}

// Author copy may mark emphasis with *asterisks* (the questions he takes to
// Dad, a line like *Is this it?*). Render those as italics, links as links.
export function richText(text: string): ReactNode[] {
  return text.split(/(\*[^*\n]+\*)/g).map((part, i) =>
    /^\*[^*\n]+\*$/.test(part) ? <em key={i}>{part.slice(1, -1)}</em> : <span key={i}>{linkify(part)}</span>,
  )
}
