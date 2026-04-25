// ABOUTME: Renders structured insight text with support for bold headers, bullet points, and links.
// ABOUTME: Lightweight markdown subset renderer — no external dependencies.

import styles from './InsightText.module.css'

interface Props {
  text: string
}

interface TextSegment {
  type: 'text' | 'bold' | 'link'
  content: string
  href?: string
}

function parseInlineSegments(line: string): TextSegment[] {
  const segments: TextSegment[] = []
  const pattern = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: line.slice(lastIndex, match.index) })
    }

    if (match[1]) {
      segments.push({ type: 'bold', content: match[1] })
    } else if (match[2] && match[3]) {
      segments.push({ type: 'link', content: match[2], href: match[3] })
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < line.length) {
    segments.push({ type: 'text', content: line.slice(lastIndex) })
  }

  return segments
}

function InlineContent({ segments }: { segments: TextSegment[] }) {
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'bold') return <strong key={i}>{seg.content}</strong>
        if (seg.type === 'link') {
          return (
            <a
              key={i}
              href={seg.href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
              onClick={e => e.stopPropagation()}
            >
              {seg.content}
            </a>
          )
        }
        return <span key={i}>{seg.content}</span>
      })}
    </>
  )
}

export function InsightText({ text }: Props) {
  const lines = text.split('\n').filter(l => l.trim() !== '')

  return (
    <div className={styles.insight}>
      {lines.map((line, i) => {
        const trimmed = line.trim()

        // Section header: line is entirely bold like **Signal**
        if (/^\*\*.+\*\*$/.test(trimmed)) {
          const headerText = trimmed.slice(2, -2)
          return <h4 key={i} className={styles.sectionHeader}>{headerText}</h4>
        }

        // Bullet point
        if (trimmed.startsWith('- ')) {
          const content = trimmed.slice(2)
          const segments = parseInlineSegments(content)
          return (
            <div key={i} className={styles.bullet}>
              <span className={styles.bulletDot}>•</span>
              <span className={styles.bulletText}>
                <InlineContent segments={segments} />
              </span>
            </div>
          )
        }

        // Regular paragraph
        const segments = parseInlineSegments(trimmed)
        return (
          <p key={i} className={styles.paragraph}>
            <InlineContent segments={segments} />
          </p>
        )
      })}
    </div>
  )
}
