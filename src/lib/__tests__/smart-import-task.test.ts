import { beforeEach, describe, expect, it } from "vitest";
import { smartImportTask } from "../smart-import-task";

describe("smart import task", () => {
  beforeEach(() => smartImportTask.reset());

  it("keeps loading state outside a route component", () => {
    expect(smartImportTask.begin()).toBe(true);
    expect(smartImportTask.get()).toEqual({ status: "loading", error: null });
    expect(smartImportTask.begin()).toBe(false);
    smartImportTask.succeed();
  });

  it("exposes completion for a returning smart-import page", () => {
    smartImportTask.begin();
    smartImportTask.succeed();
    expect(smartImportTask.get()).toEqual({ status: "success", error: null });
  });

  it("stores a failure without a navigation action", () => {
    smartImportTask.begin();
    smartImportTask.fail("AI 服务暂时繁忙");
    expect(smartImportTask.get()).toEqual({
      status: "error",
      error: "AI 服务暂时繁忙",
    });
  });
});
