import { describe, expect, it } from "vitest";
import { canonicalTags, cleanTags, isLanguage } from "./tech-tags";

describe("tech tags", () => {
  it("merges spellings of the same thing", () => {
    expect(cleanTags(["Go", "golang", "GoLang"])).toEqual(["Go"]);
    expect(cleanTags(["javascipt", "JavaScript", "js"])).toEqual(["JavaScript"]);
    expect(cleanTags(["AI", "Artificial Intelligence"])).toEqual(["AI"]);
    expect(cleanTags(["nodejs", "Node.js", "node"])).toEqual(["Node.js"]);
  });

  it("splits combined tags and gives proper spellings", () => {
    expect(canonicalTags("C/C++")).toEqual(["C", "C++"]);
    expect(canonicalTags("AI/ML")).toEqual(["AI", "Machine learning"]);
    expect(canonicalTags("python")).toEqual(["Python"]);
    expect(canonicalTags("pytorch")).toEqual(["PyTorch"]);
  });

  it("drops empty and meaningless tags, keeps unknown ones as written", () => {
    expect(cleanTags(["", "  ", "Other", "Genomics"])).toEqual(["Genomics"]);
  });

  it("tells languages from topics", () => {
    expect(isLanguage("Python")).toBe(true);
    expect(isLanguage("c++")).toBe(true);
    expect(isLanguage("Kubernetes")).toBe(false);
    expect(isLanguage("Machine learning")).toBe(false);
  });
});
