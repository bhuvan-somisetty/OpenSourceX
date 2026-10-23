import { describe, expect, it } from "vitest";
import {
  analyzeDelivery,
  maxQuestions,
  MODE_KEYS,
  offlineQuestions,
  offlineReport,
  scoreOffline,
  tidyTechnologies,
  type InterviewProject,
  type Turn,
} from "./coach";

const p: InterviewProject = {
  id: "mp-1",
  name: "Stale PV cleaner",
  org: "Kubernetes",
  program: "LFX Mentorship",
  summary:
    "A Kubernetes operator to remove stale persistent volumes of failed statefulset replicas",
  technologies: ["Go", "Kubernetes"],
  repoUrl: "https://github.com/example/pv-cleaner",
  mentors: ["A Mentor"],
};

describe("interview coach", () => {
  it("builds distinct questions for every mode, named after the project", () => {
    for (const m of MODE_KEYS) {
      const qs = offlineQuestions(p, m, 5, 2);
      expect(qs).toHaveLength(5);
      expect(new Set(qs.map((q) => q.id)).size).toBe(5);
      for (const q of qs) expect(q.lookFor.length).toBeGreaterThan(1);
    }
    expect(offlineQuestions(p, "understanding", 1)[0]!.text).toContain("Stale PV cleaner");
  });

  it("counts words, pace and filler words", () => {
    const d = analyzeDelivery("Um so basically it like removes um stale volumes", 6);
    expect(d.words).toBe(9);
    expect(d.wpm).toBe(90);
    expect(d.fillerCount).toBe(4);
    expect(d.fillers.find((f) => f.word === "um")?.count).toBe(2);
  });

  it("scores a specific, structured answer above a vague one", () => {
    const q = offlineQuestions(p, "understanding", 1)[0]!;
    const good =
      "First, the problem: when a statefulset replica fails, its persistent volumes stay behind and waste storage. The operator is written in Go and runs in Kubernetes, so it watches pods through the API and deletes stale volumes. For example, cluster admins no longer clean them by hand, which means fewer errors and lower cost.";
    const bad = "um it is like a tool i think";
    const g = scoreOffline(p, q, good, analyzeDelivery(good, 30));
    const b = scoreOffline(p, q, bad, analyzeDelivery(bad, 4));
    expect(g.overall).toBeGreaterThan(b.overall + 20);
    expect(b.improve.length).toBeGreaterThan(0);
    expect(g.strengths.some((s) => s.includes("Go"))).toBe(true);
  });

  it("reports averages and focus areas from the weakest scores", () => {
    const qs = offlineQuestions(p, "technical", 2);
    const turns: Turn[] = qs.map((q) => {
      const answer = "um like basically I would check the logs";
      const delivery = analyzeDelivery(answer, 5);
      return {
        question: q,
        answer,
        seconds: 5,
        delivery,
        feedback: scoreOffline(p, q, answer, delivery),
      };
    });
    const r = offlineReport(p, turns);
    expect(r.overall).toBeGreaterThan(0);
    expect(r.focus.length).toBeGreaterThan(0);
    expect(r.focus[0]!.actions.length).toBeGreaterThan(1);
    expect(r.delivery.fillerCount).toBeGreaterThan(0);
  });
});

describe("tidyTechnologies", () => {
  it("keeps short technology names from sentence-like skills", () => {
    expect(
      tidyTechnologies([
        "familiarity with Golang, some knowledge about the K8s architecture, APIs",
        "Proficiency in Golang (Go) is essential",
        "REST APIs",
      ]),
    ).toEqual(["Go", "Kubernetes", "APIs", "REST APIs"]);
  });
});

describe("several interview types", () => {
  it("takes turns across the chosen modes without repeats", () => {
    const qs = offlineQuestions(p, ["pr", "technical"], 6);
    expect(qs.map((q) => q.mode)).toEqual([
      "pr",
      "technical",
      "pr",
      "technical",
      "pr",
      "technical",
    ]);
    expect(new Set(qs.map((q) => q.id)).size).toBe(6);
  });
  it("has enough questions for a long interview on everything", () => {
    expect(maxQuestions(MODE_KEYS)).toBeGreaterThanOrEqual(50);
    expect(offlineQuestions(p, MODE_KEYS, 10)).toHaveLength(10);
    expect(offlineQuestions(p, ["understanding"], 10)).toHaveLength(10);
  });
});
