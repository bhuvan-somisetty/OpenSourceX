import { redirect } from "next/navigation";

/** The old project catalog. Programs is the way in now; each project keeps its own page. */
export default function Projects() {
  redirect("/programs");
}
