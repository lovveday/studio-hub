import PDFDocument from "pdfkit";
import type { Brand } from "./types";
import type { ViralityAnalysis } from "./virality-types";
import { formatTimecode } from "./virality-types";

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
      const doc = new PDFDocument({ size: "A4", margin: 0 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err: Error) => reject(err));

      const width = doc.page.width;
      const height = doc.page.height;
      const margin = 44;
      const contentWidth = width - margin * 2;

      // Page 1: Competitor Teardown & Hook Mechanics
      doc.rect(0, 0, width, height).fill("#F7F5F0");
      doc.rect(0, 0, width, 140).fill("#111318");

      // Header tag
      doc
        .fillColor("#FF5A36")
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("STUDIO HUB · VIRALITY LAB / TEARDOWN BRIEF", margin, 36, {
          characterSpacing: 1.5,
        });

      // Title & brand
      doc
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .fontSize(22)
        .text(truncate(teardown.title, 55), margin, 56, { width: contentWidth });

      doc
        .fillColor("#C9C4B8")
        .font("Helvetica")
        .fontSize(10)
        .text(
          `Target: ${brand.name} · Source: ${analysis.creator || "Unknown creator"} · Platform: ${analysis.platform.toUpperCase()} · ${formatTimecode(teardown.duration_seconds)}`,
          margin,
          92,
          { width: contentWidth }
        );

      let y = 160;

      // Section: Hook Anatomy
      doc.rect(margin, y, contentWidth, 100).fill("#FFFFFF");
      doc.rect(margin, y, contentWidth, 100).stroke("#E4E0D6");

      doc
        .fillColor("#FF5A36")
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("THE HOOK MECHANICS (0–3 SECONDS)", margin + 14, y + 14, {
          characterSpacing: 1.2,
        });

      doc
        .fillColor("#111318")
        .font("Helvetica-Bold")
        .fontSize(13)
        .text(`“${truncate(teardown.hook.text, 90)}”`, margin + 14, y + 28, {
          width: contentWidth - 28,
        });

      doc
        .fillColor("#6C675D")
        .font("Helvetica")
        .fontSize(9.5)
        .text(
          `Device: ${teardown.hook.device} · Why it caught attention: ${teardown.hook.why}`,
          margin + 14,
          y + 64,
          { width: contentWidth - 28 }
        );

      y += 114;

      // Section: Pacing & Structure
      doc
        .fillColor("#111318")
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("Pacing & Story Structure", margin, y);

      y += 18;

      const pacingBoxWidth = (contentWidth - 12) / 3;
      const pacingStats = [
        ["Cuts per minute", `${teardown.pacing.cuts_per_minute}/min`],
        ["Avg shot length", `${teardown.pacing.average_shot_seconds}s`],
        ["Wording overlap", analysis.similarity ? `${Math.round(analysis.similarity.score * 100)}%` : "N/A"],
      ];

      pacingStats.forEach(([label, val], idx) => {
        const bx = margin + idx * (pacingBoxWidth + 6);
        doc.rect(bx, y, pacingBoxWidth, 48).fill("#FFFFFF");
        doc.rect(bx, y, pacingBoxWidth, 48).stroke("#E4E0D6");
        doc
          .fillColor("#6C675D")
          .font("Helvetica")
          .fontSize(8)
          .text(label, bx + 10, y + 10);
        doc
          .fillColor("#111318")
          .font("Helvetica-Bold")
          .fontSize(14)
          .text(val, bx + 10, y + 24);
      });

      y += 62;

      // Section: Timeline Beats (up to 4)
      doc
        .fillColor("#111318")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("Key Timeline Beats", margin, y);

      y += 16;

      const keyBeats = teardown.timeline.slice(0, 4);
      keyBeats.forEach((beat) => {
        doc.rect(margin, y, contentWidth, 34).fill("#FFFFFF");
        doc.rect(margin, y, contentWidth, 34).stroke("#E4E0D6");
        doc
          .fillColor("#FF5A36")
          .font("Helvetica-Bold")
          .fontSize(9)
          .text(`${formatTimecode(beat.start)}–${formatTimecode(beat.end)}`, margin + 10, y + 11);
        doc
          .fillColor("#111318")
          .font("Helvetica-Bold")
          .fontSize(9)
          .text(beat.beat, margin + 70, y + 11);
        doc
          .fillColor("#6C675D")
          .font("Helvetica")
          .fontSize(8.5)
          .text(truncate(beat.visual, 75), margin + 180, y + 11, { width: contentWidth - 190 });
        y += 40;
      });

      y += 10;

      // Section: Why it likely worked (Hypotheses)
      doc
        .fillColor("#111318")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("Hypotheses on Retention", margin, y);

      y += 16;

      const hypotheses = teardown.why_it_worked.slice(0, 2);
      hypotheses.forEach((hyp) => {
        doc.rect(margin, y, contentWidth, 46).fill("#FFFFFF");
        doc.rect(margin, y, contentWidth, 46).stroke("#E4E0D6");
        doc
          .fillColor("#111318")
          .font("Helvetica-Bold")
          .fontSize(9)
          .text(`• ${hyp.claim}`, margin + 10, y + 9, { width: contentWidth - 20 });
        doc
          .fillColor("#6C675D")
          .font("Helvetica")
          .fontSize(8.5)
          .text(`Evidence: ${truncate(hyp.evidence, 110)}`, margin + 18, y + 25, {
            width: contentWidth - 30,
          });
        y += 52;
      });

      // PAGE 2: Brand Adaptation & Production Script
      doc.addPage();
      doc.rect(0, 0, width, height).fill("#F7F5F0");
      doc.rect(0, 0, width, 100).fill("#111318");

      doc
        .fillColor("#FF5A36")
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("STRATEGY & EXECUTION BLUEPRINT", margin, 30, { characterSpacing: 1.5 });

      doc
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .fontSize(18)
        .text(`${brand.name}: ${truncate(adaptation.angle, 50)}`, margin, 46, { width: contentWidth });

      doc
        .fillColor("#C9C4B8")
        .font("Helvetica")
        .fontSize(9)
        .text("Grounded in verified brand facts with zero verbatim copying.", margin, 74);

      let y2 = 120;

      // Opening Line
      doc.rect(margin, y2, contentWidth, 54).fill("#FFFFFF");
      doc.rect(margin, y2, contentWidth, 54).stroke("#E4E0D6");
      doc
        .fillColor("#FF5A36")
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("PROPOSED OPENING HOOK", margin + 12, y2 + 10, { characterSpacing: 1 });
      doc
        .fillColor("#111318")
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(`“${adaptation.hook}”`, margin + 12, y2 + 25, { width: contentWidth - 24 });

      y2 += 68;

      // Script Outline
      doc
        .fillColor("#111318")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("Adapted Script & Shot List", margin, y2);

      y2 += 16;

      const scriptBeats = adaptation.script_outline.slice(0, 5);
      scriptBeats.forEach((beat) => {
        doc.rect(margin, y2, contentWidth, 42).fill("#FFFFFF");
        doc.rect(margin, y2, contentWidth, 42).stroke("#E4E0D6");
        doc
          .fillColor("#FF5A36")
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .text(`${formatTimecode(beat.start)}–${formatTimecode(beat.end)}`, margin + 10, y2 + 8);
        doc
          .fillColor("#111318")
          .font("Helvetica-Bold")
          .fontSize(9)
          .text(beat.beat, margin + 70, y2 + 8);
        doc
          .fillColor("#111318")
          .font("Helvetica")
          .fontSize(8.5)
          .text(truncate(beat.line, 95), margin + 70, y2 + 22, { width: contentWidth - 80 });
        y2 += 48;
      });

      y2 += 8;

      // Call to action & test plan
      doc
        .fillColor("#111318")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("Call to Action & A/B Test Plan", margin, y2);

      y2 += 16;

      const halfW = (contentWidth - 10) / 2;

      // CTA box
      doc.rect(margin, y2, halfW, 76).fill("#FFFFFF");
      doc.rect(margin, y2, halfW, 76).stroke("#E4E0D6");
      doc
        .fillColor("#6C675D")
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("PRIMARY CALL TO ACTION", margin + 10, y2 + 10);
      doc
        .fillColor("#111318")
        .font("Helvetica")
        .fontSize(9)
        .text(adaptation.cta, margin + 10, y2 + 26, { width: halfW - 20 });

      // A/B Test box
      const bx2 = margin + halfW + 10;
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
          ? `\nResult: ${truncate(testWinnerName, 24)} won${analysis.test_a_value != null && analysis.test_b_value != null ? ` (${analysis.test_a_value} vs ${analysis.test_b_value})` : ""}`
          : "";
      doc.rect(bx2, y2, halfW, 88).fill("#FFFFFF");
      doc.rect(bx2, y2, halfW, 88).stroke("#E4E0D6");
      doc
        .fillColor("#6C675D")
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("2-VARIANT TEST PLAN", bx2 + 10, y2 + 10);
      doc
        .fillColor("#111318")
        .font("Helvetica")
        .fontSize(8.5)
        .text(
          `Var A: ${truncate(adaptation.test_plan.variant_a.change, 40)}\nVar B: ${truncate(
            adaptation.test_plan.variant_b.change,
            40
          )}\nMetric: ${adaptation.test_plan.metric} (${adaptation.test_plan.window})${testResult}`,
          bx2 + 10,
          y2 + 24,
          { width: halfW - 20 }
        );

      y2 += 100;

      // Footer notice
      doc
        .fillColor("#8F8A7E")
        .font("Helvetica")
        .fontSize(7.5)
        .text(
          "Generated by Studio Hub Virality Lab. Read for structure, not copyright. Grounded in approved brand facts only.",
          margin,
          y2,
          { width: contentWidth, align: "center" }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
