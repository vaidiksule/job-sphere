import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { devOrAdminDenied, requireDevOrAdmin } from '@/lib/dev-guard';

export async function GET() {
  if (!(await requireDevOrAdmin())) return devOrAdminDenied();
  try {
    // Attempt to access storage tables directly to create bucket
    await sql`
      INSERT INTO storage.buckets (id, name, public) 
      VALUES ('resumes', 'resumes', true)
      ON CONFLICT (id) DO NOTHING;
    `;

    // Attempt to create select policy
    try {
      await sql`
        CREATE POLICY "Public Access" 
        ON storage.objects FOR SELECT 
        USING ( bucket_id = 'resumes' );
      `;
    } catch(e) { }

    // Attempt to create insert policy
    try {
      await sql`
        CREATE POLICY "Anon Upload" 
        ON storage.objects FOR INSERT 
        WITH CHECK ( bucket_id = 'resumes' );
      `;
    } catch(e) { }

    // Add resume_url to applications
    try {
      await sql`
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_url TEXT;
      `;
    } catch(e) { }

    return NextResponse.json({ success: true, message: "Storage initialized!" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack });
  }
}
