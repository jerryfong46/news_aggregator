import { NextResponse } from 'next/server';
import { z } from 'zod';
import { saveProgressEvent } from '@/lib/progress';

const baseEvent = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timestamp: z.string(),
};

const progressEventSchema = z.discriminatedUnion('type', [
  z.object({
    ...baseEvent,
    type: z.literal('pt_card_review'),
    cardId: z.string().min(1),
    front: z.string().min(1),
    back: z.string(),
    tag: z.string().min(1),
    rating: z.enum(['again', 'hard', 'easy']),
    learned: z.boolean(),
  }),
  z.object({
    ...baseEvent,
    type: z.literal('workout_completed'),
    workoutName: z.string().min(1),
    completed: z.boolean(),
  }),
  z.object({
    ...baseEvent,
    type: z.literal('workout_lift'),
    workoutName: z.string().min(1),
    liftName: z.string().min(1),
    prescription: z.string(),
    value: z.string(),
  }),
]);

export async function POST(request: Request) {
  const parsed = progressEventSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid progress event' }, { status: 400 });
  }

  try {
    await saveProgressEvent(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('progress_save_failed', error);
    return NextResponse.json({ error: 'Progress storage unavailable' }, { status: 503 });
  }
}

