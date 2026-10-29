/** Kotlin String.lines() equivalent. */
export const kotlinLines = (value: string): string[] => value.split(/\r\n|\n|\r/);

export const nonBlankLines = (text: string): string[] =>
  kotlinLines(text)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
