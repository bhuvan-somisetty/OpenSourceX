import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/features/legal/LegalPage";
import { securityContact } from "@/lib/security-contact";

export const metadata: Metadata = { title: "Terms of Service" };
export const dynamic = "force-dynamic";

/** Plain-language terms for using OpenSourceX. */
export default function Terms() {
  const contact = securityContact();
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of Service"
      updated="17 October 2026"
      testId="terms-page"
    >
      <p>
        By using OpenSourceX you agree to these terms. If you do not agree, please do not use the
        website.
      </p>

      <h2>The service</h2>
      <p>
        OpenSourceX is a free website that collects information about open source mentorship
        programs, organizations, projects and repositories, and offers an assistant (Ask) that
        answers questions about open source. Features may change, and the service may be unavailable
        at times.
      </p>

      <h2>Information and AI answers</h2>
      <p>
        Program details (stipends, dates, eligibility) come from official sources and are dated, but
        they can change at any time. Ask uses AI models and live public data, and its answers can be
        incomplete or wrong. Always check important details, such as deadlines, eligibility and
        payments, on the program&apos;s official page before you rely on them. OpenSourceX is not
        affiliated with or endorsed by Google, the Linux Foundation, CNCF, Outreachy or any other
        program or organization it lists.
      </p>

      <h2>Your account</h2>
      <p>
        You can use OpenSourceX as a guest or sign in with GitHub or Google. You are responsible for
        activity under your account. Do not share sensitive personal information, passwords or keys
        in your questions.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not misuse the service, attempt to break its security, or overload it.</li>
        <li>
          Do not scrape it at scale or use automated tools to send large volumes of questions.
        </li>
        <li>Do not use it for anything illegal, abusive or harmful.</li>
        <li>
          Do not use it to produce spam or bulk AI-generated applications, pull requests or messages
          for open source projects.
        </li>
      </ul>
      <p>We may limit or suspend access that breaks these rules.</p>

      <h2>Third-party content</h2>
      <p>
        OpenSourceX links to and shows data from other websites and services (GitHub, program
        websites, community chats and others). Their own terms apply, and we are not responsible for
        their content. Some program content is used under its licence, for example CNCF material
        under CC BY 4.0, with attribution.
      </p>

      <h2>No warranty</h2>
      <p>
        The service is provided &quot;as is&quot;, without warranties of any kind. To the extent the
        law allows, OpenSourceX is not liable for losses that come from using it or relying on its
        information.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We may update these terms, and the date at the top will change when we do.
        {contact ? (
          <>
            {" "}
            Questions: <a href={`mailto:${contact}`}>{contact}</a>.
          </>
        ) : null}{" "}
        See also the <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </LegalPage>
  );
}
