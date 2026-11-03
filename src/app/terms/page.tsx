import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms — My Social Hub" };

export default function TermsPage() {
  const email = process.env.SUPPORT_EMAIL || "privacy@example.com";
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <Link href="/login" className="text-xs font-semibold text-coral">
        ← My Social Hub
      </Link>
      <h1 className="display mt-4 text-4xl text-ink">Terms of service</h1>
      <p className="mt-2 text-xs text-muted">Last updated: November 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink/80">
        <section>
          <h2 className="text-base font-semibold text-ink">The service</h2>
          <p className="mt-2">
            My Social Hub helps an agency team manage client brands: capture knowledge, compose and
            approve posts, schedule and publish through connected platforms, handle comments and
            produce reports. Features depend on the platform APIs you have access to.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">Your responsibilities</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>You must have the right to manage every account, page and brand you connect.</li>
            <li>You are responsible for the content you publish and for client approvals.</li>
            <li>You must follow each platform&apos;s terms, automation rules and advertising rules.</li>
            <li>Do not use the service for spam, unlawful content, harassment or deceptive claims.</li>
            <li>Keep your login details secure and tell us about unauthorised access.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">Platform access</h2>
          <p className="mt-2">
            Publishing and engagement depend on Meta, Google/YouTube, LinkedIn, X and TikTok approvals,
            quotas and availability. We can pause or fail an action when a platform rejects it or a
            token expires. Assisted mode is always available as a fallback.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">No warranty</h2>
          <p className="mt-2">
            The service is provided &quot;as is&quot;. We do not guarantee uninterrupted availability,
            platform approval, reach, engagement or business results. To the extent permitted by law,
            the operator is not liable for indirect or consequential loss.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">Termination and data</h2>
          <p className="mt-2">
            You may stop using the service at any time. On request we will export or delete the data
            associated with your workspace, subject to legal and platform record-keeping obligations.
            See the{" "}
            <Link href="/data-deletion" className="font-medium text-[#0A66C2]">
              data deletion page
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">Contact</h2>
          <p className="mt-2">
            Questions about these terms:{" "}
            <a href={`mailto:${email}`} className="font-medium text-[#0A66C2]">
              {email}
            </a>
            .
          </p>
        </section>
      </div>

      <footer className="mt-10 flex gap-4 border-t border-line pt-4 text-xs text-muted">
        <Link href="/privacy" className="hover:text-ink">
          Privacy
        </Link>
        <Link href="/data-deletion" className="hover:text-ink">
          Data deletion
        </Link>
      </footer>
    </main>
  );
}
