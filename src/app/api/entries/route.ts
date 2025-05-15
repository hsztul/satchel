import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/entries: Returns a list of entries (with filter/sort/search/pagination support)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entryType = searchParams.get('entryType');
  const status = searchParams.get('status');
  const industryParam = searchParams.get('industry');
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const searchTerm = searchParams.get('searchTerm') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

  let query = supabase
    .from('entries')
    .select('*', { count: 'exact' })
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (entryType) query = query.eq('entry_type', entryType);
  if (status) query = query.eq('status', status);
  if (industryParam) {
    const industryList = industryParam.split(',').map(i => i.trim()).filter(Boolean);
    if (industryList.length > 1) {
      query = query.overlaps('industries', industryList);
    } else {
      query = query.contains('industries', industryList);
    }
  }
  if (searchTerm) {
    query = query.ilike('title', `%${searchTerm}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      pageSize,
      total: count,
      totalPages: count ? Math.ceil(count / pageSize) : 0,
    },
  });
}

// POST /api/entries: Create a new entry (note)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cleaned_content, metadata, ...rest } = body;
    if (!cleaned_content) {
      return NextResponse.json({ error: 'cleaned_content is required' }, { status: 400 });
    }
    // Default entry_type to 'note' if not provided
    const entry_type = rest.entry_type || 'note';
    const insertData = {
      cleaned_content,
      metadata,
      entry_type,
      ...rest
    };
    const { data, error } = await supabase
      .from('entries')
      .insert([insertData])
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}