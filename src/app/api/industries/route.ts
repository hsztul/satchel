import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    // Get distinct industries from the entries table
    const { data, error } = await supabase
      .from('entries')
      .select('industries')
      .not('industries', 'eq', '{}');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Flatten and deduplicate industries
    const uniqueIndustries = [...new Set(
      data
        .flatMap(entry => entry.industries || [])
        .filter(Boolean)
        .sort()
    )];

    return NextResponse.json({ industries: uniqueIndustries });
  } catch (err) {
    console.error('[GetIndustries] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch industries' },
      { status: 500 }
    );
  }
}
