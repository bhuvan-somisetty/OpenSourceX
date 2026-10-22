import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/features/legal/LegalPage";
import { securityContact } from "@/lib/security-contact";

export const metadata: Metadata = { title: "Privacy Policy" };
export const dynamic = "force-dynamic";

/** What OpenSourceX collects, why, who processes it, and how to delete it. */
export default function Privacy() {
  const contact = securityContact();
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      updated="18 October 2026"
      testId="privacy-page"
    >
      <p>
        OpenSourceX helps people learn about open source, mentorship programs and the organizations
        in them. This policy explains what we collect when you use the website, and why.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <b>Account details, if you sign in with GitHub or Google:</b> your account id with that
          provider and your display name. Your name, email address and profile picture come from the
          provider and are kept only in your encrypted sign-in cookie, not in our database. We never
          see or store your GitHub or Google password.
        </li>
        <li>
          <b>Guest sessions:</b> if you continue as a guest, a random id is stored in a cookie for
          up to 7 days. It is not linked to your identity.
        </li>
        <li>
          <b>Your chats on Ask:</b> the questions you ask and the answers, so your chat history is
          there when you come back. You can delete any chat at any time from the chat sidebar.
        </li>
        <li>
          <b>Problem reports (Help &amp; support):</b> the category, subject, description, page link
          and any screenshots or photos you attach. Only you and OpenSourceX staff can see them.
          Email addresses typed into a report are removed automatically.
        </li>
        <li>
          <b>Saved items:</b> the programs, projects, organizations and repositories you choose to
          save.
        </li>
        <li>
          <b>Basic technical data:</b> our hosting provider processes IP addresses and request logs
          to run and protect the site, for example to limit abuse.
        </li>
      </ul>
      <p>We do not sell your data, show ads, or use tracking or advertising cookies.</p>

      <h2>Who processes data for us</h2>
      <ul>
        <li>
          <b>Vercel</b> hosts the website, and <b>Neon</b> hosts the database.
        </li>
        <li>
          <b>GitHub and Google</b> handle sign-in when you choose them.
        </li>
        <li>
          <b>AI providers</b> (currently Google Gemini) receive the text of your question and recent
          messages in that chat to write an answer. Please do not put passwords, keys or other
          sensitive personal information in your questions. In interview practice they receive the
          text of your answers and the project's recorded facts to score them; answers are not
          saved.
        </li>
        <li>
          <b>Your browser's speech service</b> turns your voice into text when you answer out loud
          in interview practice (Chrome and Edge use Google's and Microsoft's services for this).
          OpenSourceX never receives audio.
        </li>
        <li>
          <b>Public APIs</b> (GitHub, package registries, OSV.dev, Hacker News, Stack Exchange,
          Wikipedia) receive search terms taken from your question when you ask for live data. They
          do not receive your identity.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We use only the cookies needed to keep you signed in (or to keep your guest session) and to
        protect sign-in against forgery. A small setting such as whether the chat sidebar is open
        may be remembered in your browser&apos;s local storage.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Chats and saved items are kept until you delete them or ask us to delete your account.
        Problem reports, including withdrawn ones and their images, are kept so we can follow up,
        until you ask us to delete them. Guest data can be removed after the guest session ends. If
        a guest signs in, their guest chats and saved items move to the new account.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Delete individual chats from the Ask sidebar, and remove saved items from Saved.</li>
        <li>Sign out at any time from the profile menu.</li>
        <li>
          Ask us to export or delete everything linked to your account
          {contact ? (
            <>
              {" "}
              by emailing <a href={`mailto:${contact}`}>{contact}</a>
            </>
          ) : null}
          .
        </li>
        <li>You can remove OpenSourceX&apos;s access in your GitHub or Google account settings.</li>
      </ul>

      <h2>Children</h2>
      <p>OpenSourceX is not directed at children under 13.</p>

      <h2>Changes</h2>
      <p>
        If this policy changes, the date at the top changes too. See also the{" "}
        <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalPage>
  );
}
