import type { MiniappDiary } from '../../services/diaryApi'

interface JournalDraft {
  photo?: string
  edit?: MiniappDiary
}

let draft: JournalDraft = {}

export function setJournalDraft(next: JournalDraft) {
  draft = next
}

export function takeJournalDraft(): JournalDraft {
  const current = draft
  draft = {}
  return current
}
