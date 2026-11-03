import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy — My Social Hub" };

export default function PrivacyPage() {
  const email = process.env.SUPPORT_EMAIL || "privacy@example.com";
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <Link href="/login" className="text-xs font-semibold text-coral">
        ← My Social Hub
      </Link>
      <h1 className="display mt-4 text-4xl text-ink">Privacy policy</h1>
      <p className="mt-2 text-xs text-muted">Last updated: November 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink/80">
        <section>
          <h2 className="text-base font-semibold text-ink">Who we are</h2>
          <p className="mt-2">
            My Social Hub is a social media management tool operated by the agency using this
            installation. For privacy questions or deletion requests, contact{" "}
            <a href={`mailto:${email}`} className="font-medium text-[#0A66C2]">
              {email}
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">What we collect</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Account details: name, email, role and login session.</li>
            <li>
              Client brand information, documents, notes, voice-note transcripts, images and videos
              that you upload.
            </li>
            <li>
              Connected social account identifiers, page/channel IDs and OAuth tokens. Tokens are
              encrypted at rest with AES-256-GCM.
            </li>
            <li>
              Post content, approvals, scheduling data, comments and engagement records, analytics
              snapshots and generated reports.
            </li>
            <li>Operational logs, errors and audit events needed to run and secure the service.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">How we use it</h2>
          <p className="mt-2">
            To let your team plan, create, approve, schedule and publish content; to read and respond
            to comments where the connected platform allows it; to produce analytics and reports; to
            keep an audit trail; and to secure the service. We do not sell personal data.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">Sharing</h2>
          <p className="mt-2">
            Content and tokens are shared with the social platforms you connect (Meta, Google,
            LinkedIn, X, TikTok) only to perform the actions you request. Infrastructure providers
            process data on our behalf under their terms. We may disclose data if required by law.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">Retention</h2>
          <p className="mt-2">
            Business records are kept while the client relationship is active and for a reasonable
            period afterwards. Transient data — webhook events, job logs, prompts and voice audio — is
            pruned on a schedule. Voice audio is deleted after seven days by default. You can request
            export or deletion at any time.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">Your choices</h2>
          <p className="mt-2">
            You can disconnect a social account, delete media and posts, export client data, or ask us
            to delete your account and associated data. See the{" "}
            <Link href="/data-deletion" className="font-medium text-[#0A66C2]">
              data deletion page
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">Security</h2>
          <p className="mt-2">
            We use encrypted token storage, role-based access, signed sessions, audit logs and
            least-privilege platform scopes. No system is perfectly secure; report a concern to{" "}
            <a href={`mailto:${email}`} className="font-medium text-[#0A66C2]">
              {email}
            </a>
            .
          </p>
        </section>
      </div>

      <footer className="mt-10 flex gap-4 border-t border-line pt-4 text-xs text-muted">
        <Link href="/terms" className="hover:text-ink">
          Terms
        </Link>
        <Link href="/data-deletion" className="hover:text-ink">
          Data deletion
        </Link>
      </footer>
    </main>
  );
}
