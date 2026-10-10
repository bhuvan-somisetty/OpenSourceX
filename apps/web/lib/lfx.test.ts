import { describe, expect, it } from "vitest";
import { getOrgInitials } from "./orgs";

describe("getOrgInitials", () => {
  it("extracts clean monogram initials for single words", () => {
    expect(getOrgInitials("Jaeger")).toBe("JA");
    expect(getOrgInitials("Thanos")).toBe("TH");
    expect(getOrgInitials("Harbor")).toBe("HA");
  });

  it("extracts first letter of first two words for multi-word orgs", () => {
    expect(getOrgInitials("OpenTelemetry")).toBe("OP");
    expect(getOrgInitials("Service Mesh Interface")).toBe("SM");
    expect(getOrgInitials("Cloud Native Buildpacks")).toBe("CN");
    expect(getOrgInitials("Kube-Burner")).toBe("KB");
    expect(getOrgInitials("in_toto")).toBe("IT");
  });

  it("handles special cases like Kubernetes cleanly", () => {
    expect(getOrgInitials("Kubernetes")).toBe("K8s");
  });

  it("handles empty or whitespace strings safely", () => {
    expect(getOrgInitials("")).toBe("ORG");
    expect(getOrgInitials("   ")).toBe("ORG");
  });
});
