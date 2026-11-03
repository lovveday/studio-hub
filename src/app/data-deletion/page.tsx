import Link from "next/link";
import type { Metadata } from "next";
import { get } from "@/lib/db";

export const metadata: Metadata = { title: "Data deletion — My Social Hub" };

export default async function DataDeletionPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const request = code
    ? get<{ status: string; created_at: string }>(
        "SELECT status, created_at FROM deletion_requests WHERE confirmation_code = ?",
        [code]
      )
    : undefined;
  const email = process.env.SUPPORT_EMAIL || "privacy@example.com";

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <Link href="/login" className="text-xs font-semibold text-coral">
        ← My Social Hub
      </Link>
      <h1 className="display mt-4 text-4xl text-ink">Data deletion</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        You can ask us to delete the data associated with your My Social Hub account, a client brand, or
        a connected social account. This page explains the process and shows the status of a confirmed
        request.
      </p>

      {code ? (
        <div className="mt-6 rounded-2xl border border-line bg-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Request</p>
          <p className="mt-1 text-sm font-semibold text-ink">{code}</p>
          <p className="mt-2 text-sm text-ink/80">
            Status: <span className="font-semibold">{request?.status ?? "not found"}</span>
          </p>
          {request ? (
            <p className="mt-1 text-xs text-muted">Received {new Date(request.created_at).toLocaleString("en-GB")}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink/80">
        <section>
          <h2 className="text-base font-semibold text-ink">Request deletion</h2>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            <li>
              Email{" "}
              <a href={`mailto:${email}`} className="font-medium text-[#0A66C2]">
                {email}
              </a>{" "}
              from the address on the account, with the subject &quot;Data deletion request&quot;.
            </li>
            <li>Include the workspace name and, if relevant, the client brand or connected account.</li>
            <li>We will confirm receipt and may ask you to verify ownership.</li>
            <li>We delete or anonymise the data within a reasonable period, except records we must keep by law.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">What gets deleted</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Brand knowledge, documents, voice notes, transcripts and derived facts.</li>
            <li>Drafts, scheduled posts, media, approvals and generated reports.</li>
            <li>Stored social account tokens; you should also revoke access in the platform itself.</li>
            <li>Operational records that are not required for legal, security or accounting purposes.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">Platform accounts</h2>
          <p className="mt-2">
            Deleting data in My Social Hub does not delete your Facebook, Instagram, YouTube, LinkedIn, X
            or TikTok accounts. Revoke My Social Hub in each platform&apos;s connected-apps settings as
            well.
          </p>
        </section>
      </div>

      <footer className="mt-10 flex gap-4 border-t border-line pt-4 text-xs text-muted">
        <Link href="/privacy" className="hover:text-ink">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-ink">
          Terms
        </Link>
      </footer>
    </main>
  );
}
