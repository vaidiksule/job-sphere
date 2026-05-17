import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { devOrAdminDenied, requireDevOrAdmin } from '@/lib/dev-guard';

export async function GET() {
  if (!(await requireDevOrAdmin())) return devOrAdminDenied();
  try {
    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = client.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.5-flash" });
    const result = await model.generateContent("Hello");
    return NextResponse.json({ ok: true, text: result.response.text() });
  } catch(e: any) {
    return NextResponse.json({ error: e.message });
  }
}
