// Reads lyric files in the browser: UTF-8 TXT/LRC, and DOCX paragraphs.
import JSZip from "jszip";

export type LyricFileKind = "lrc" | "txt" | "docx";

export function lyricFileKind(name: string): LyricFileKind | null {
  const ext = name.toLowerCase().split(".").pop();
  return ext === "lrc" || ext === "txt" || ext === "docx" ? ext : null;
}

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

/** DOCX -> one line per non-empty paragraph. */
export async function readDocxParagraphs(file: Blob): Promise<string[]> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) throw new Error("无法读取 DOCX 正文");
  return (xml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) ?? [])
    .map((p) =>
      decodeXml(
        p
          .replace(/<w:tab\/>/g, " ")
          .replace(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g, "\u0000$1\u0000")
          .split("\u0000")
          .filter((_, i) => i % 2 === 1)
          .join(""),
      ).trim(),
    )
    .filter(Boolean);
}

export async function readLyricFile(file: File): Promise<{ kind: LyricFileKind; text: string }> {
  const kind = lyricFileKind(file.name);
  if (!kind) throw new Error("仅支持 LRC、TXT 或 DOCX 文件");
  if (kind === "docx") return { kind, text: (await readDocxParagraphs(file)).join("\n") };
  const text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
  return { kind, text };
}
