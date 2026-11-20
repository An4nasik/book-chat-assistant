import type { Fragment, Paragraph } from '../types.js'

// Склеиваем соседние абзацы одной главы, пока фрагмент не превысит maxChars.
export function chunkParagraphs(paragraphs: Paragraph[], maxChars = 600): Fragment[] {
  const fragments: Fragment[] = []
  let chapter = ''
  let lines: string[] = []

  function flush(): void {
    if (lines.length > 0) {
      const index = fragments.length

      fragments.push({ id: `f${index}`, index, chapter, text: lines.join('\n') })
      lines = []
    }
  }

  for (const paragraph of paragraphs) {
    const length = lines.join('\n').length + paragraph.text.length

    if (paragraph.chapter !== chapter || length > maxChars) {
      flush()
      chapter = paragraph.chapter
    }

    lines.push(paragraph.text)
  }

  flush()

  return fragments
}
