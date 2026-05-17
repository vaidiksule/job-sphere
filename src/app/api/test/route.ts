import { NextResponse } from 'next/server';
import { devOrAdminDenied, requireDevOrAdmin } from '@/lib/dev-guard';

export async function GET() {
  if (!(await requireDevOrAdmin())) return devOrAdminDenied();
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    return NextResponse.json({ models: data.models.map((m: any) => m.name) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
