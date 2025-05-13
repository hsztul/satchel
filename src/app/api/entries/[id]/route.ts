import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// DELETE /api/entries/[id]: Deletes a single entry by id
export async function DELETE(request: Request) {
  const segments = request.url.split('/');
  const id = segments[segments.length - 1];

  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}

// GET /api/entries/[id]: Returns a single entry by id
export async function GET(request: Request) {
  const segments = request.url.split('/');
  const id = segments[segments.length - 1];

  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || 'Entry not found' },
      { status: error ? 500 : 404 }
    );
  }

  return NextResponse.json(data);
}
