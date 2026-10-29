import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Download, PenLine, Search, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/library/parts";

export const Route = createFileRoute("/add/")({
  head: () => ({ meta: [{ title: "添加歌曲 · 音咏 OtoYomi" }] }),
  component: AddPage,
});

const options = [
  {
    to: "/add/smart",
    icon: Sparkles,
    title: "智能导入",
    desc: "粘贴混合或格式凌乱的歌词，自动识别并分行",
  },
  {
    to: "/add/search",
    icon: Search,
    title: "在线搜索",
    desc: "按歌名或歌手从 LRCLIB 查找歌词",
  },
  {
    to: "/add/file",
    icon: Download,
    title: "导入文件",
    desc: "导入原文、罗马音或交替排版的 TXT、DOCX",
  },
  {
    to: "/add/manual",
    icon: PenLine,
    title: "手动输入",
    desc: "支持分栏输入，也支持原文与罗马音交替粘贴",
  },
] as const;

function AddPage() {
  return (
    <section>
      <PageHeader title="添加歌曲" />
      <ul className="-mx-5 border-y sm:-mx-8">
        {options.map((option) => (
          <li key={option.to} className="border-b last:border-b-0">
            <Link to={option.to} className="flex min-h-28 items-center gap-5 px-6 py-5">
              <option.icon className="h-8 w-8 shrink-0 text-muted-foreground" strokeWidth={2} />
              <div className="min-w-0 flex-1">
                <div className="text-xl font-semibold">{option.title}</div>
                <div className="mt-1 text-base leading-snug text-muted-foreground">
                  {option.desc}
                </div>
              </div>
              <ChevronRight className="h-7 w-7 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
