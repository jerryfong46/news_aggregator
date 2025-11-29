import { NextRequest, NextResponse } from 'next/server';
import { addHandle, getHandles, removeHandle } from '@/lib/kv';
import { z } from 'zod';

const AddHandleSchema = z.object({
  handle: z.string().min(1).max(15),
});

export async function GET() {
  try {
    const handles = await getHandles();
    return NextResponse.json({ handles });
  } catch (error) {
    console.error('Error fetching handles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch handles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { handle } = AddHandleSchema.parse(body);

    const newHandle = await addHandle(handle);
    return NextResponse.json({ handle: newHandle }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid handle format' },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === 'Handle already exists') {
      return NextResponse.json(
        { error: 'Handle already exists' },
        { status: 409 }
      );
    }
    console.error('Error adding handle:', error);
    return NextResponse.json(
      { error: 'Failed to add handle' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Handle ID is required' },
        { status: 400 }
      );
    }

    await removeHandle(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing handle:', error);
    return NextResponse.json(
      { error: 'Failed to remove handle' },
      { status: 500 }
    );
  }
}
