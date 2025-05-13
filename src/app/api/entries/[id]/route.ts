import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// DELETE /api/entries/[id]: Deletes an entry by id
export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing entry id' }, { status: 400 });
  }
  const { error } = await supabase.from('entries').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}

// GET /api/entries/[id]: Returns a single entry by id
export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing entry id' }, { status: 400 });
  }
  const { data, error } = await supabase.from('entries').select('*').eq('id', id).single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Entry not found' }, { status: 404 });
  }
  return NextResponse.json(data);
}
