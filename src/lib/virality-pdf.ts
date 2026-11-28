import PDFDocument from "pdfkit";
import type { Brand } from "./types";
import type { ViralityAnalysis } from "./virality-types";
import { formatTimecode } from "./virality-types";

const INK = "#111318";
const PAPER = "#F7F5F0";
const WHITE = "#FFFFFF";
const CORAL = "#FF5A36";
const MUTED = "#6C675D";
const LINE = "#E4E0D6";
const LIGHT = "#C9C4B8";

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export async function generateViralityPdf(
  analysis: ViralityAnalysis,
  brand: Brand
): Promise<Buffer> {
  const teardown = analysis.teardown;
  const adaptation = analysis.adaptation;
  if (!teardown || !adaptation) {
    throw new Error("Cannot generate PDF: teardown or adaptation is missing.");
  }

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 0,
        info: {
          Title: `${brand.name} · Virality Lab teardown`,
          Author: "Studio Hub",
          Subject: "Virality Lab teardown and adaptation brief",
        },
      });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err: Error) => reject(err));

      const width = doc.page.width;
      const height = doc.page.height;
      const margin = 44;
      const contentWidth = width - margin * 2;
      const bottom = height - 38;

      const paintPage = () => {
        doc.rect(0, 0, width, height).fill(PAPER);
      };

      const setFont = (font: "Helvetica" | "Helvetica-Bold", size: number) => {
        doc.font(font).fontSize(size);
      };

      const measure = (
        text: string,
        font: "Helvetica" | "Helvetica-Bold",
        size: number,
        boxWidth: number,
        lineGap = 1
      ) => {
        setFont(font, size);
        return doc.heightOfString(text, { width: boxWidth, lineGap });
      };

      const box = (x: number, y: number, w: number, h: number, fill = WHITE) => {
        doc.rect(x, y, w, h).fill(fill);
        doc.lineWidth(0.8).rect(x, y, w, h).stroke(LINE);
      };

      let y = 0;

      const continuationPage = (section: string) => {
        doc.addPage();
        paintPage();
        doc.rect(0, 0, width, 74).fill(INK);
        doc
          .fillColor(CORAL)
          .font("Helvetica-Bold")
          .fontSize(8)
          .text("STUDIO HUB · VIRALITY LAB / CONTINUED", margin, 26, {
            characterSpacing: 1.4,
          });
        doc
          .fillColor(WHITE)
          .font("Helvetica-Bold")
          .fontSize(14)
          .text(section, margin, 44, { width: contentWidth });
        y = 94;
      };

      const ensure = (needed: number, section: string) => {
        if (y + needed > bottom) continuationPage(section);
      };

      const sectionTitle = (label: string, size = 12) => {
        ensure(26, label);
        setFont("Helvetica-Bold", size);
        doc.fillColor(INK).text(label, margin, y, { width: contentWidth });
        y += size + 8;
      };

      /* ------------------------------- Page 1 ------------------------------- */
      paintPage();

      const titleText = truncate(teardown.title || "Untitled teardown", 110);
      const metaText = `Target: ${brand.name} · Source: ${
        analysis.creator || "Unknown creator"
      } · Platform: ${analysis.platform.toUpperCase()} · ${formatTimecode(
        teardown.duration_seconds
      )}`;
      const titleHeight = measure(titleText, "Helvetica-Bold", 22, contentWidth, 2);
      const metaHeight = measure(metaText, "Helvetica", 10, contentWidth, 1);
      const headerHeight = Math.max(148, 56 + titleHeight + 10 + metaHeight + 24);

      doc.rect(0, 0, width, headerHeight).fill(INK);
      doc
        .fillColor(CORAL)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("STUDIO HUB · VIRALITY LAB / TEARDOWN BRIEF", margin, 36, {
          characterSpacing: 1.5,
        });

      setFont("Helvetica-Bold", 22);
      doc.fillColor(WHITE).text(titleText, margin, 56, {
        width: contentWidth,
        lineGap: 2,
      });

      setFont("Helvetica", 10);
      doc
        .fillColor(LIGHT)
        .text(metaText, margin, 56 + titleHeight + 10, {
          width: contentWidth,
          lineGap: 1,
        });

      y = headerHeight + 20;

      // The hook
      const hookText = `“${teardown.hook.text}”`;
      const hookBody = `Device: ${teardown.hook.device} · Why it caught attention: ${teardown.hook.why}`;
      const hookInner = contentWidth - 28;
      const hookTextHeight = measure(hookText, "Helvetica-Bold", 13, hookInner, 2);
      const hookBodyHeight = measure(hookBody, "Helvetica", 9.5, hookInner, 1);
      const hookBoxHeight = 14 + 8 + hookTextHeight + 8 + hookBodyHeight + 14;
      ensure(hookBoxHeight, "THE HOOK MECHANICS");

      box(margin, y, contentWidth, hookBoxHeight);
      doc
        .fillColor(CORAL)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("THE HOOK MECHANICS (0–3 SECONDS)", margin + 14, y + 14, {
          characterSpacing: 1.2,
        });
      setFont("Helvetica-Bold", 13);
      doc
        .fillColor(INK)
        .text(hookText, margin + 14, y + 30, { width: hookInner, lineGap: 2 });
      setFont("Helvetica", 9.5);
      doc.fillColor(MUTED).text(hookBody, margin + 14, y + 30 + hookTextHeight + 8, {
        width: hookInner,
        lineGap: 1,
      });
      y += hookBoxHeight + 18;

      // Pacing
      sectionTitle("Pacing & Story Structure");
      const pacingGap = 6;
      const pacingWidth = (contentWidth - pacingGap * 2) / 3;
      const pacingStats = [
        ["Cuts per minute", `${teardown.pacing.cuts_per_minute}/min`],
        ["Avg shot length", `${teardown.pacing.average_shot_seconds}s`],
        [
          "Wording overlap",
          analysis.similarity ? `${Math.round(analysis.similarity.score * 100)}%` : "N/A",
        ],
      ];
      pacingStats.forEach(([label, value], index) => {
        const x = margin + index * (pacingWidth + pacingGap);
        box(x, y, pacingWidth, 48);
        doc
          .fillColor(MUTED)
          .font("Helvetica")
          .fontSize(8)
          .text(label, x + 10, y + 10, { width: pacingWidth - 20 });
        doc
          .fillColor(INK)
          .font("Helvetica-Bold")
          .fontSize(14)
          .text(value, x + 10, y + 25, { width: pacingWidth - 20 });
      });
      y += 62;

      // Timeline
      sectionTitle("Key Timeline Beats", 11);
      const timeWidth = 62;
      const beatWidth = 100;
      const visualX = margin + timeWidth + beatWidth + 10;
      const visualWidth = contentWidth - timeWidth - beatWidth - 20;
      for (const beat of teardown.timeline) {
        const beatHeight = measure(beat.beat, "Helvetica-Bold", 9, beatWidth - 8, 1);
        const visualHeight = measure(beat.visual || "—", "Helvetica", 8.5, visualWidth, 1);
        const rowHeight = Math.max(30, Math.max(beatHeight, visualHeight) + 16);
        ensure(rowHeight + 6, "KEY TIMELINE BEATS");
        box(margin, y, contentWidth, rowHeight);
        doc
          .fillColor(CORAL)
          .font("Helvetica-Bold")
          .fontSize(9)
          .text(
            `${formatTimecode(beat.start)}–${formatTimecode(beat.end)}`,
            margin + 10,
            y + 10,
            { width: timeWidth - 10 }
          );
        doc
          .fillColor(INK)
          .font("Helvetica-Bold")
          .fontSize(9)
          .text(beat.beat, margin + timeWidth + 10, y + 10, { width: beatWidth - 8 });
        doc
          .fillColor(MUTED)
          .font("Helvetica")
          .fontSize(8.5)
          .text(beat.visual || "—", visualX, y + 10, { width: visualWidth, lineGap: 1 });
        y += rowHeight + 6;
      }
      y += 6;

      // Hypotheses
      if (teardown.why_it_worked.length) {
        sectionTitle("Hypotheses on Retention", 11);
        for (const hypothesis of teardown.why_it_worked) {
          const inner = contentWidth - 20;
          const claim = `• ${hypothesis.claim}`;
          const evidence = `Evidence: ${hypothesis.evidence}`;
          const claimHeight = measure(claim, "Helvetica-Bold", 9, inner, 1);
          const evidenceHeight = measure(evidence, "Helvetica", 8.5, inner, 1);
          const boxHeight = 12 + claimHeight + 4 + evidenceHeight + 12;
          ensure(boxHeight + 6, "HYPOTHESES ON RETENTION");
          box(margin, y, contentWidth, boxHeight);
          doc
            .fillColor(INK)
            .font("Helvetica-Bold")
            .fontSize(9)
            .text(claim, margin + 10, y + 12, { width: inner, lineGap: 1 });
          doc
            .fillColor(MUTED)
            .font("Helvetica")
            .fontSize(8.5)
            .text(evidence, margin + 10, y + 12 + claimHeight + 4, {
              width: inner,
              lineGap: 1,
            });
          y += boxHeight + 6;
        }
      }

      /* ------------------------------- Page 2 ------------------------------- */
      doc.addPage();
      paintPage();

      const adaptationTitle = `${brand.name}: ${truncate(adaptation.angle, 90)}`;
      const adaptationTitleHeight = measure(
        adaptationTitle,
        "Helvetica-Bold",
        18,
        contentWidth,
        2
      );
      const adaptationMeta = "Grounded in verified brand facts with zero verbatim copying.";
      const adaptationMetaHeight = measure(adaptationMeta, "Helvetica", 9, contentWidth, 1);
      const adaptationHeaderHeight = Math.max(
        112,
        46 + adaptationTitleHeight + 8 + adaptationMetaHeight + 24
      );

      doc.rect(0, 0, width, adaptationHeaderHeight).fill(INK);
      doc
        .fillColor(CORAL)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("STRATEGY & EXECUTION BLUEPRINT", margin, 30, {
          characterSpacing: 1.5,
        });
      setFont("Helvetica-Bold", 18);
      doc.fillColor(WHITE).text(adaptationTitle, margin, 46, {
        width: contentWidth,
        lineGap: 2,
      });
      setFont("Helvetica", 9);
      doc
        .fillColor(LIGHT)
        .text(adaptationMeta, margin, 46 + adaptationTitleHeight + 8, {
          width: contentWidth,
          lineGap: 1,
        });
      y = adaptationHeaderHeight + 20;

      // Opening hook
      const openingText = `“${adaptation.hook}”`;
      const openingHeight = measure(openingText, "Helvetica-Bold", 12, contentWidth - 24, 2);
      const openingBoxHeight = 12 + 8 + openingHeight + 12;
      ensure(openingBoxHeight, "PROPOSED OPENING HOOK");
      box(margin, y, contentWidth, openingBoxHeight);
      doc
        .fillColor(CORAL)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("PROPOSED OPENING HOOK", margin + 12, y + 12, {
          characterSpacing: 1,
        });
      setFont("Helvetica-Bold", 12);
      doc
        .fillColor(INK)
        .text(openingText, margin + 12, y + 26, {
          width: contentWidth - 24,
          lineGap: 2,
        });
      y += openingBoxHeight + 18;

      // Script
      sectionTitle("Adapted Script & Shot List", 11);
      const scriptTimeWidth = 62;
      const scriptBeatWidth = 100;
      const scriptTextX = margin + scriptTimeWidth + 10;
      const scriptTextWidth = contentWidth - scriptTimeWidth - 20;
      for (const beat of adaptation.script_outline) {
        const beatHeight = measure(beat.beat, "Helvetica-Bold", 9, scriptBeatWidth - 8, 1);
        const lineHeight = measure(beat.line, "Helvetica", 8.5, scriptTextWidth, 1);
        const rowHeight = Math.max(38, 12 + beatHeight + 6 + lineHeight + 10);
        ensure(rowHeight + 6, "ADAPTED SCRIPT & SHOT LIST");
        box(margin, y, contentWidth, rowHeight);
        doc
          .fillColor(CORAL)
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .text(
            `${formatTimecode(beat.start)}–${formatTimecode(beat.end)}`,
            margin + 10,
            y + 10,
            { width: scriptTimeWidth - 10 }
          );
        doc
          .fillColor(INK)
          .font("Helvetica-Bold")
          .fontSize(9)
          .text(beat.beat, scriptTextX, y + 10, { width: scriptBeatWidth - 8 });
        doc
          .fillColor(INK)
          .font("Helvetica")
          .fontSize(8.5)
          .text(beat.line, scriptTextX, y + 10 + beatHeight + 6, {
            width: scriptTextWidth,
            lineGap: 1,
          });
        y += rowHeight + 6;
      }
      y += 6;

      // CTA / test plan
      sectionTitle("Call to Action & A/B Test Plan", 11);
      const halfWidth = (contentWidth - 10) / 2;
      const testWinnerName =
        analysis.test_winner === "a"
          ? adaptation.test_plan.variant_a.name
          : analysis.test_winner === "b"
            ? adaptation.test_plan.variant_b.name
            : analysis.test_winner === "tie"
              ? "Tie"
              : "";
      const testResult =
        analysis.test_status === "complete" && testWinnerName
          ? `\nResult: ${truncate(testWinnerName, 34)} won${
              analysis.test_a_value != null && analysis.test_b_value != null
                ? ` (${analysis.test_a_value} vs ${analysis.test_b_value})`
                : ""
            }`
          : "";
      const testText = `Var A: ${adaptation.test_plan.variant_a.change}\nVar B: ${adaptation.test_plan.variant_b.change}\nMetric: ${adaptation.test_plan.metric} (${adaptation.test_plan.window})${testResult}`;
      const ctaHeight = measure(adaptation.cta, "Helvetica", 9, halfWidth - 20, 1);
      const testHeight = measure(testText, "Helvetica", 8.5, halfWidth - 20, 1);
      const ctaBoxHeight = Math.max(
        88,
        12 + 8 + 10 + Math.max(ctaHeight, testHeight) + 16
      );
      ensure(ctaBoxHeight + 8, "CALL TO ACTION & TEST PLAN");

      box(margin, y, halfWidth, ctaBoxHeight);
      doc
        .fillColor(MUTED)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("PRIMARY CALL TO ACTION", margin + 10, y + 12, {
          width: halfWidth - 20,
        });
      doc
        .fillColor(INK)
        .font("Helvetica")
        .fontSize(9)
        .text(adaptation.cta, margin + 10, y + 30, {
          width: halfWidth - 20,
          lineGap: 1,
        });

      const testX = margin + halfWidth + 10;
      box(testX, y, halfWidth, ctaBoxHeight);
      doc
        .fillColor(MUTED)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("2-VARIANT TEST PLAN", testX + 10, y + 12, {
          width: halfWidth - 20,
        });
      doc
        .fillColor(INK)
        .font("Helvetica")
        .fontSize(8.5)
        .text(testText, testX + 10, y + 28, {
          width: halfWidth - 20,
          lineGap: 1,
        });
      y += ctaBoxHeight + 18;

      // Ready-to-post copy
      sectionTitle("Ready-to-post copy", 11);
      const captionText = adaptation.caption || "No caption generated.";
      const hashtagsText = adaptation.hashtags || "No hashtags generated.";
      const copyInner = contentWidth - 28;
      const captionHeight = measure(captionText, "Helvetica", 9, copyInner, 1);
      const hashtagsHeight = measure(hashtagsText, "Helvetica-Bold", 8.5, copyInner, 1);
      const copyBoxHeight = 12 + 8 + captionHeight + 10 + 8 + hashtagsHeight + 14;
      ensure(copyBoxHeight, "READY-TO-POST COPY");
      box(margin, y, contentWidth, copyBoxHeight);
      doc
        .fillColor(MUTED)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("CAPTION", margin + 14, y + 12, { characterSpacing: 0.8 });
      doc
        .fillColor(INK)
        .font("Helvetica")
        .fontSize(9)
        .text(captionText, margin + 14, y + 24, { width: copyInner, lineGap: 1 });
      const hashtagY = y + 24 + captionHeight + 10;
      doc
        .fillColor(MUTED)
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("HASHTAGS", margin + 14, hashtagY, { characterSpacing: 0.8 });
      doc
        .fillColor(CORAL)
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .text(hashtagsText, margin + 14, hashtagY + 12, {
          width: copyInner,
          lineGap: 1,
        });
      y += copyBoxHeight + 16;

      // Guardrails
      if (adaptation.guardrails.length) {
        sectionTitle("Guardrails applied", 11);
        const guardrailText = adaptation.guardrails.map((item) => `• ${item}`).join("\n");
        const guardrailHeight = measure(guardrailText, "Helvetica", 8.5, contentWidth - 28, 2);
        const guardrailBoxHeight = 12 + guardrailHeight + 14;
        ensure(guardrailBoxHeight, "GUARDRAILS APPLIED");
        box(margin, y, contentWidth, guardrailBoxHeight);
        doc
          .fillColor(INK)
          .font("Helvetica")
          .fontSize(8.5)
          .text(guardrailText, margin + 14, y + 12, {
            width: contentWidth - 28,
            lineGap: 2,
          });
        y += guardrailBoxHeight + 16;
      }

      // Footer
      doc
        .fillColor("#8F8A7E")
        .font("Helvetica")
        .fontSize(7.5)
        .text(
          "Generated by Studio Hub Virality Lab. Read for structure, not copyright. Grounded in approved brand facts only.",
          margin,
          height - 34,
          { width: contentWidth, align: "center" }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
