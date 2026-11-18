# Importing a Google NotebookLM notebook

There is **no direct NotebookLM connector** in Studio Hub, and consumer NotebookLM does not expose a source API you can authorize from this app. A shared notebook URL is also a JavaScript app, so “Add link” will not reliably read its contents.

The reliable path is: **export/download the sources from NotebookLM → add them to the Knowledge Inbox → approve the facts into the Brand Brain.**

## Before you start

Select the correct brand in the top switcher. Knowledge is per brand. If the notebook covers Lumen and Copper, split it and import each brand’s sources under that brand.

## What to import, and how

| NotebookLM item | Best import method |
|---|---|
| Uploaded PDF | Download the original PDF → Knowledge → **Upload a file** |
| Google Doc source | File → Download → **DOCX** or **PDF** → upload |
| Website source | Copy the public URL → Knowledge → **Add a link** |
| YouTube source | Copy the transcript into **Add a note**; a link may only fetch page metadata |
| NotebookLM notes / summary | Copy the text → **Add a note**, or export to Google Docs and upload the DOCX/PDF |
| Screenshots / images | Upload the image; Gemini reads it with vision |
| Audio Overview | Optional: upload the audio and let Gemini transcribe it. Treat it as a summary, not a primary source |

Accepted: `.pdf`, `.docx`, `.doc`, `.txt`, `.md`, `.markdown`, `.html`, `.htm`, `.csv`, images and audio. Maximum 30 MB per file. `.ipynb` is not in the accepted list; convert a Colab notebook to PDF/TXT or paste the relevant cells as a note.

## Step by step

1. Open the brand’s **Knowledge** page.
2. Use one of:
   - **Add a note** — paste the text.
   - **Upload a file** — PDF/DOCX/TXT/MD/HTML/image/audio.
   - **Add a link** — public article or reference page.
3. Open the new source and check the extracted summary/transcript. Edit it if a name, price or date was missed.
4. Click **Approve into Brand Brain**.
5. Review the **fact candidates** on the right. Approve the ones that are true and current. Add a manual fact if the extraction missed one.
6. Approved facts appear under **Brand facts → Approved** and are what the writer is allowed to use.

Nothing becomes a brand fact until you approve it.

## NotebookLM link caveat

Do not paste the private NotebookLM notebook URL into **Add a link**. The app fetches public HTML; it will not log into Google or execute NotebookLM’s JavaScript. If you make a notebook public, the share page still does not expose the sources as readable text.

For Google Docs, download the document rather than pasting the edit URL. Google Drive OAuth/file-picker integration is not built.

## Keeping it current

This is a one-time import, not a live sync. When the notebook changes:

- re-export the changed source and upload it as a new item;
- approve the new fact; it supersedes the old value and keeps history.

## Multi-brand notebooks

Do not dump an entire multi-brand notebook into one brand. Split by brand:

- Lumen sources → Lumen Skin Knowledge
- Copper sources → Copper & Co Knowledge
- Northstar sources → Northstar Fit Knowledge

This prevents one client’s pricing or claims from leaking into another client’s writing.
