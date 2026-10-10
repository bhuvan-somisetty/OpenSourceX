export function getOrgInitials(name: string): string {
  const clean = (name || "").trim();
  if (!clean) return "ORG";
  if (clean.toLowerCase() === "kubernetes") return "K8s";
  const words = clean.split(/[\s-_]+/);
  if (words.length >= 2) {
    return ((words[0]?.[0] || "") + (words[1]?.[0] || "")).toUpperCase() || "ORG";
  }
  return clean.slice(0, 2).toUpperCase() || "ORG";
}
