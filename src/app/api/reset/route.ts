import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { devOrAdminDenied, requireDevOrAdmin } from '@/lib/dev-guard';

export async function GET() {
  if (!(await requireDevOrAdmin())) return devOrAdminDenied();
  try {
    await sql`UPDATE applications SET analysis_status = 'pending', fit_score = NULL, match_breakdown = NULL, application_insights = NULL, structured_resume = NULL;`;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
