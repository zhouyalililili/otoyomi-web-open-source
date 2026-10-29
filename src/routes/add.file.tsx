import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, FileText, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { PageHeader } from "@/components/library/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  assembleSingleKind,
  detectMixed,
  markIncompleteReadingIssues,
  nonBlankLines,
  stripTimestamps,
  type SingleKind,
} from "@/core";
import { draftStore } from "@/lib/draft-store";
import { assembler, prepareJapaneseRomanizer } from "@/lib/lyrics-engine";
import { cn } from "@/lib/utils";
import { readLyricFile } from "@/services/file-text";

export const Route = createFileRoute("/add/file")({
  head: () => ({
    meta: [
      { title: "导入歌词文件 · 音咏 OtoYomi" },
      {
        name: "description",
        content: "导入 UTF-8 编码的 LRC、TXT 或 DOCX 歌词文件。",
      },
      { property: "og:title", content: "导入歌词文件 · 音咏 OtoYomi" },
      {
        property: "og:description",
        content: "导入 UTF-8 编码的 LRC、TXT 或 DOCX 歌词文件。",
      },
    ],
  }),
  component: FileImportPage,
});

type ImportKind = SingleKind | "alternating";

function FileImportPage() {
  const [kind, setKind] = useState<ImportKind | null>(null);
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mixed, setMixed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  async function onFile(f: File | undefined) {
    setError(null);
    setMixed(false);
    if (!f) return;
    try {
      const { text } = await readLyricFile(f);
      setFile({ name: f.name, text });
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
    } catch (e) {
      setFile(null);
      setError(
        e instanceof TypeError
          ? "文件不是 UTF-8 编码"
          : e instanceof Error
            ? e.message
            : "读取失败",
      );
    }
  }

  async function proceed() {
    if (!file || !kind) return;
    const lines = nonBlankLines(file.text).map(stripTimestamps).filter(Boolean);
    if (!lines.length) {
      setError("文件里没有可用的歌词行");
      return;
    }
    if (kind !== "alternating" && detectMixed(lines, kind)) {
      setMixed(true);
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      await prepareJapaneseRomanizer();
      const meta = { title, artist, source: "file" };
      const assembled =
        kind === "alternating"
          ? assembler.assembleAlternating({ ...meta, japanese: file.text })
          : assembleSingleKind(assembler, file.text, kind, meta);
      const draft = markIncompleteReadingIssues(assembled);
      draftStore.setDraft(draft);
      void navigate({ to: "/review" });
    } catch (e) {
      setProcessing(false);
      setError(e instanceof Error ? e.message : "日文读音生成失败，请重试");
    }
  }

  return (
    <section>
      <PageHeader title="导入 LRC / TXT / DOCX" back />

      <h2 className="mb-2 text-sm font-medium">第一步：文件里是什么内容？</h2>
      <div className="mb-5 grid grid-cols-3 gap-3">
        {(["original", "romaji", "alternating"] as const).map((k) => (
          <button
            key={k}
            onClick={() => {
              setKind(k);
              setMixed(false);
            }}
            className={cn(
              "rounded-xl border p-4 text-center",
              kind === k ? "border-primary bg-primary/5 font-medium text-primary" : "",
            )}
          >
            {k === "original" ? "仅原文" : k === "romaji" ? "仅罗马音" : "原文 + 罗马音交替"}
          </button>
        ))}
      </div>

      <button
        disabled={!kind}
        onClick={() => inputRef.current?.click()}
        className="flex h-44 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed text-sm disabled:opacity-50"
      >
        <FileText className="h-8 w-8 text-primary" />
        {file ? file.name : kind ? "选择歌词文件" : "请先选择内容类型"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".lrc,.txt,.docx"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      {file && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="歌名" />
          <Input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="歌手" />
        </div>
      )}

      <h2 className="mt-6 border-b pb-2 text-sm font-medium">文件规则</h2>
      <ol className="mt-3 space-y-3 text-sm">
        {[
          "UTF-8 编码的 LRC 或 TXT；DOCX 按段落读取",
          "一句歌词占一行，空行会被忽略",
          "LRC 时间标签格式：[00:12.34]，保留毫秒",
          "可选择仅原文、仅罗马音，或一行原文一行罗马音的交替排版",
        ].map((r, i) => (
          <li key={r} className="flex items-center gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary text-xs text-primary">
              {i + 1}
            </span>
            {r}
          </li>
        ))}
      </ol>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div
        className={cn(
          "mt-5 flex gap-3 rounded-xl p-4 text-sm",
          mixed ? "bg-destructive/10" : "bg-primary/5",
        )}
      >
        <AlertCircle className="h-5 w-5 shrink-0 text-primary" />
        <div>
          {mixed
            ? "检测到原文与罗马音混排，规范导入不会自动猜测对应关系。"
            : "内容混乱或原文、罗马音混排？"}
          <Link to="/add/smart" className="mt-1 block font-medium text-primary">
            改用智能导入
          </Link>
        </div>
      </div>

      <Button
        className="mt-6 h-12 w-full text-base"
        disabled={!file || !kind || processing}
        onClick={() => void proceed()}
      >
        {processing && <Loader2 className="h-4 w-4 animate-spin" />}
        {processing ? "正在生成读音…" : file && kind ? "解析并校对" : "选择文件后继续"}
      </Button>
    </section>
  );
}
