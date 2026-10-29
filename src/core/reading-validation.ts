// Reading diagnostics used to flag lines for review without blocking the whole draft.
import { LyricIssue, type SongDraft } from "@/types";

const JAPANESE = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff々〆]/u;
const PLACEHOLDER = /无罗马音|無ローマ字/u;

export const containsJapanese = (value: string) => JAPANESE.test(value);

/** 1-based line numbers of Japanese lines lacking a pure romaji or a clean sing-along. */
export function findIncompleteReadingLines(draft: Pick<SongDraft, "lines">): number[] {
  const failed: number[] = [];
  draft.lines.forEach((line, index) => {
    if (!containsJapanese(line.japanese)) return;
    const romaji = line.romaji.trim();
    const sing = line.singAlong.trim();
    const ok =
      romaji !== "" &&
      !containsJapanese(romaji) &&
      !PLACEHOLDER.test(romaji) &&
      sing !== "" &&
      !/[\u3040-\u30ff]/u.test(sing) &&
      !PLACEHOLDER.test(sing);
    if (!ok) failed.push(index + 1);
  });
  return failed;
}

/**
 * Marks unresolved Japanese lines for confirmation and always returns a usable draft.
 * A failed reading belongs in the editor, where the user can fix it; it is not a reason to
 * reject every other successfully generated line in the song.
 */
export function markIncompleteReadingIssues(draft: SongDraft): SongDraft {
  const failed = new Set(findIncompleteReadingLines(draft).map((line) => line - 1));
  if (!failed.size) return draft;
  return {
    ...draft,
    lines: draft.lines.map((line, index) => {
      if (!failed.has(index)) return line;
      return {
        ...line,
        issues: [
          LyricIssue.NEEDS_CONFIRMATION,
          ...line.issues.filter(
            (issue) =>
              issue !== LyricIssue.NEEDS_CONFIRMATION && issue !== LyricIssue.ORIGINAL_ONLY,
          ),
        ],
      };
    }),
  };
}
