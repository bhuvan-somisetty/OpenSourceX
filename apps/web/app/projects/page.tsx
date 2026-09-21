import { redirect } from "next/navigation";

/** The project list lives in Discover, so there is one place to browse and filter projects. */
export default function Projects() {
  redirect("/discover");
}
