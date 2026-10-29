import type { JapaneseTokenizer, Token } from "@/core";

interface KuromojiToken {
  surface_form: string;
  reading?: string;
}

interface KuromojiTokenizer {
  tokenize(text: string): KuromojiToken[];
}

interface KuromojiApi {
  builder(options: { dicPath: string }): {
    build(callback: (error: Error | null, tokenizer: KuromojiTokenizer) => void): void;
  };
}

let tokenizerPromise: Promise<JapaneseTokenizer> | undefined;

export const KUROMOJI_DICT_FILES = [
  "base.dat",
  "check.dat",
  "tid.dat",
  "tid_pos.dat",
  "tid_map.dat",
  "cc.dat",
  "unk.dat",
  "unk_pos.dat",
  "unk_map.dat",
  "unk_char.dat",
  "unk_compat.dat",
  "unk_invoke.dat",
] as const;

function dictionaryPath(): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.endsWith("/") ? base : `${base}/`}kuromoji-dict/`;
}

/** Maps Kuromoji's requested `*.dat.gz` URL to the published `*.dat.bin` file (same gzip bytes). */
export function mapDictionaryUrl(url: string): string {
  return /\/kuromoji-dict\/[a-z_]+\.dat\.gz$/.test(url) ? url.replace(/\.gz$/, ".bin") : url;
}

let xhrPatched = false;
function patchDictionaryRequests() {
  if (xhrPatched || typeof XMLHttpRequest === "undefined") return;
  xhrPatched = true;
  const original = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    const mapped = typeof url === "string" ? mapDictionaryUrl(url) : url;
    return (original as (...args: unknown[]) => void).call(this, method, mapped, ...rest);
  } as typeof XMLHttpRequest.prototype.open;
}

function adaptToken(token: KuromojiToken): Token {
  return {
    surface: token.surface_form,
    reading: token.reading ?? null,
  };
}

/**
 * Loads kuromoji's official prebuilt browser bundle as a same-origin script.
 * Importing the CommonJS sources through Vite breaks its bundled zlib (top-level `this`).
 */
async function loadKuromojiScript(): Promise<KuromojiApi> {
  const w = window as unknown as { kuromoji?: KuromojiApi };
  if (w.kuromoji) return w.kuromoji;
  const { default: src } = await import("kuromoji/build/kuromoji.js?url");
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.appendChild(script);
  });
  if (!w.kuromoji) throw new Error("kuromoji bundle did not register");
  return w.kuromoji;
}

export function loadKuromojiTokenizer(): Promise<JapaneseTokenizer> {
  if (tokenizerPromise) return tokenizerPromise;
  patchDictionaryRequests();

  tokenizerPromise = loadKuromojiScript()
    .then(
      (kuromoji) =>
        new Promise<JapaneseTokenizer>((resolve, reject) => {
          kuromoji.builder({ dicPath: dictionaryPath() }).build((error, tokenizer) => {
            if (error) {
              reject(error);
              return;
            }
            resolve({
              tokenize: (line) => tokenizer.tokenize(line).map(adaptToken),
            });
          });
        }),
    )
    .catch((error: unknown) => {
      tokenizerPromise = undefined;
      throw new Error("日文读音词典加载失败，请刷新页面后重试", {
        cause: error,
      });
    });

  return tokenizerPromise;
}
