import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { KUROMOJI_DICT_FILES, mapDictionaryUrl } from "@/services/kuromoji-tokenizer";

describe("kuromoji dictionary publishing", () => {
  it("maps .dat.gz requests to .dat.bin", () => {
    expect(mapDictionaryUrl("/kuromoji-dict/base.dat.gz")).toBe("/kuromoji-dict/base.dat.bin");
    expect(mapDictionaryUrl("/other/file.gz")).toBe("/other/file.gz");
  });

  it("ships all 12 dictionaries byte-identical to kuromoji", () => {
    expect(KUROMOJI_DICT_FILES).toHaveLength(12);
    for (const name of KUROMOJI_DICT_FILES) {
      const published = `public/kuromoji-dict/${name}.bin`;
      expect(existsSync(published), published).toBe(true);
      expect(
        readFileSync(published).equals(readFileSync(`node_modules/kuromoji/dict/${name}.gz`)),
      ).toBe(true);
    }
  });
});
