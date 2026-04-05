import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { extractResumeTextFromImage } from "@/lib/gemini";

export class ResumeExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeExtractionError";
  }
}

export async function extractResumeText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name.toLowerCase();
  const mimeType = file.type;

  if (mimeType.startsWith("image/") || [".png", ".jpg", ".jpeg", ".webp"].some((extension) => fileName.endsWith(extension))) {
    try {
      const extracted = await extractResumeTextFromImage({
        bytesBase64: buffer.toString("base64"),
        mimeType: mimeType || guessImageMimeType(fileName),
        fileName: file.name,
      });
      return cleanText(extracted);
    } catch (error) {
      console.error("Gemini image extraction failed:", error);
      throw new ResumeExtractionError("We couldn't read that resume image with Gemini. Try a clearer PNG/JPG screenshot with all text visible.");
    }
  }

  if (fileName.endsWith(".pdf")) {
    try {
      const parser = new PDFParse({ data: buffer });
      const parsed = await parser.getText();
      await parser.destroy();
      return cleanText(parsed.text);
    } catch {
      throw new ResumeExtractionError("We couldn't read that PDF cleanly. For now, please upload a PNG/JPG image of the resume or use DOCX/TXT.");
    }
  }

  if (fileName.endsWith(".docx")) {
    try {
      const parsed = await mammoth.extractRawText({ buffer });
      return cleanText(parsed.value);
    } catch {
      throw new ResumeExtractionError("We couldn't read that DOCX file. Please re-save it as DOCX, PDF, or TXT and try again.");
    }
  }

  if (fileName.endsWith(".doc")) {
    throw new ResumeExtractionError("Legacy .doc files are not supported reliably yet. Please upload PNG, JPG, DOCX, or TXT.");
  }

  return cleanText(buffer.toString("utf-8"));
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function guessImageMimeType(fileName: string) {
  if (fileName.endsWith(".png")) return "image/png";
  if (fileName.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}
