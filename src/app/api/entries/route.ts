import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/entries: Returns a list of entries (with filter/sort/search/pagination support)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entryType = searchParams.get('entryType');
  const status = searchParams.get('status');
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
