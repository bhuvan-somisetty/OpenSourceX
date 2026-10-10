import { describe, expect, it } from "vitest";
import { listLfxOrganizations, getLfxOrganization } from "./lfx-organizations";
import type { Db } from "./client";

describe("lfx-organizations domain logic", () => {
  const mockDb = {
    query: async (sql: unknown, params?: unknown[]) => {
      const s = String(sql);
      if (s.includes("FROM mentorship_project m") && s.includes("WHERE p.slug = 'lfx-mentorship'")) {
        // If single org detail query
        if (params && params.length > 0) {
          const target = String(params[0]).toLowerCase();
          if (target === "jaeger") {
            return {
              rows: [
                {
                  id: "101",
                  title: "Jaeger Tracing Enhancement",
                  cncf_project_name: "Jaeger",
                  cncf_project_slug: "jaeger",
                  technologies: ["Go", "OpenTelemetry"],
                  summary: "Distributed tracing engine",
                  upstream_key: "https://github.com/jaegertracing/jaeger",
                  raw_repo_link: "https://github.com/jaegertracing/jaeger/issues/1",
                  lfx_project_uuid: "11111111-1111-1111-1111-111111111111",
                  provenance_id: "1",
                  year: 2026,
                  term_code: "T3",
                  track: "unspecified",
                  starts_on: "2026-09-01",
                  ends_on: "2026-11-30",
                  raw_term_name: null,
                  d_starts_on: "2026-09-01",
                  d_ends_on: "2026-11-30",
                },
                {
                  id: "102",
                  title: "Jaeger UI Migration",
                  cncf_project_name: "Jaeger",
                  cncf_project_slug: "jaeger",
                  technologies: ["TypeScript", "React"],
                  summary: "UI modernizations",
                  upstream_key: "https://github.com/jaegertracing/jaeger-ui",
                  raw_repo_link: "https://github.com/jaegertracing/jaeger-ui/issues/2",
                  lfx_project_uuid: "22222222-2222-2222-2222-222222222222",
                  provenance_id: "1",
                  year: 2026,
                  term_code: "T1",
                  track: "unspecified",
                  starts_on: "2026-03-01",
                  ends_on: "2026-05-31",
                  raw_term_name: null,
                  d_starts_on: "2026-03-01",
                  d_ends_on: "2026-05-31",
                },
                {
                  id: "103",
                  title: "Jaeger Storage Plugins",
                  cncf_project_name: "Jaeger",
                  cncf_project_slug: "jaeger",
                  technologies: ["Go", "gRPC"],
                  summary: "Storage extensions",
                  upstream_key: "https://github.com/jaegertracing/jaeger",
                  raw_repo_link: null,
                  lfx_project_uuid: "33333333-3333-3333-3333-333333333333",
                  provenance_id: "1",
                  year: 2025,
                  term_code: "T2",
                  track: "unspecified",
                  starts_on: "2025-06-01",
                  ends_on: "2025-08-31",
                  raw_term_name: null,
                  d_starts_on: "2025-06-01",
                  d_ends_on: "2025-08-31",
                },
              ],
            };
          }
          return { rows: [] };
        }

        // List query
        return {
          rows: [
            {
              id: "1",
              title: "Jaeger Tracing Enhancement",
              cncf_project_name: "Jaeger",
              cncf_project_slug: "jaeger",
              technologies: ["Go", "OpenTelemetry"],
              summary: "Distributed tracing system",
              upstream_key: "https://github.com/jaegertracing/jaeger",
              raw_repo_link: "https://github.com/jaegertracing/jaeger/issues/1",
              lfx_project_uuid: "11111111-1111-1111-1111-111111111111",
              provenance_id: "1",
              year: 2026,
              term_code: "T3",
              track: "unspecified",
              raw_term_name: null,
            },
            {
              id: "2",
              title: "Kubernetes SIG Contrib",
              cncf_project_name: "Kubernetes",
              cncf_project_slug: "kubernetes",
              technologies: ["Go", "Kubernetes"],
              summary: "Container orchestration platform",
              upstream_key: "https://github.com/kubernetes/kubernetes",
              raw_repo_link: "https://github.com/kubernetes/kubernetes/issues/1",
              lfx_project_uuid: "44444444-4444-4444-4444-444444444444",
              provenance_id: "1",
              year: 2025,
              term_code: "T1",
              track: "unspecified",
              raw_term_name: null,
            },
          ],
        };
      }

      if (s.includes("FROM person_role r")) {
        return { rows: [] };
      }

      if (s.includes("FROM provenance_record pr")) {
        return {
          rows: [
            {
              provenanceId: "1",
              dataset: "cncf-lfx-history",
              provider: "cncf",
              providerName: "CNCF",
              publisher: "Linux Foundation",
              tier: 1,
              ingestion: "recorded",
              origin: "recorded",
              url: "https://github.com/cncf/mentoring",
              fetchedAt: "2026-10-08T00:00:00.000Z",
              status: "RECORDED",
              confidence: "HIGH",
              confidenceReason: "Official upstream README",
              derivation: "direct",
              ruleId: null,
              freshness: "fresh",
            },
          ],
        };
      }

      return { rows: [] };
    },
  };

  it("lists organizations with accurate project and year counts", async () => {
    const res = await listLfxOrganizations(mockDb as unknown as Db);
    expect(res.total).toBe(2);
    expect(res.organizations).toHaveLength(2);

    const jaeger = res.organizations.find((o) => o.slug === "jaeger");
    expect(jaeger).toBeDefined();
    expect(jaeger!.name).toBe("Jaeger");
    expect(jaeger!.projectCount).toBe(1);
    expect(jaeger!.years).toEqual([2026]);
    expect(jaeger!.latestTerm).toBe("2026 T3");
  });

  it("filters organizations by name query and technology", async () => {
    const searchRes = await listLfxOrganizations(mockDb as unknown as Db, { q: "jaeger" });
    expect(searchRes.organizations).toHaveLength(1);
    expect(searchRes.organizations[0]!.name).toBe("Jaeger");

    const techRes = await listLfxOrganizations(mockDb as unknown as Db, { tech: "kubernetes" });
    expect(techRes.organizations).toHaveLength(1);
    expect(techRes.organizations[0]!.name).toBe("Kubernetes");
  });

  it("retrieves organization detail sorted newest year and term first", async () => {
    const detail = await getLfxOrganization(mockDb as unknown as Db, "jaeger");
    expect(detail).not.toBeNull();
    expect(detail!.name).toBe("Jaeger");
    expect(detail!.projectCount).toBe(3);
    expect(detail!.yearCount).toBe(2);
    expect(detail!.years).toEqual([2026, 2025]);

    // Check timeline structure: Year 2026 first, then 2025
    expect(detail!.timeline).toHaveLength(2);
    expect(detail!.timeline[0]!.year).toBe(2026);
    expect(detail!.timeline[1]!.year).toBe(2025);

    // Check terms order in Year 2026: T3 first, then T1 (newest first)
    const terms2026 = detail!.timeline[0]!.terms;
    expect(terms2026).toHaveLength(2);
    expect(terms2026[0]!.termCode).toBe("T3");
    expect(terms2026[1]!.termCode).toBe("T1");
    expect(terms2026[0]!.projects[0]!.title).toBe("Jaeger Tracing Enhancement");
  });

  it("returns null for non-existent organization", async () => {
    const detail = await getLfxOrganization(mockDb as unknown as Db, "non-existent-org");
    expect(detail).toBeNull();
  });
});
