import { kv } from '@vercel/kv';

export type ProgressEvent =
  | {
      type: 'pt_card_review';
      date: string;
      timestamp: string;
      cardId: string;
      front: string;
      back: string;
      tag: string;
      rating: 'again' | 'hard' | 'easy';
      learned: boolean;
    }
  | {
      type: 'workout_completed';
      date: string;
      timestamp: string;
      workoutName: string;
      completed: boolean;
    }
  | {
      type: 'workout_lift';
      date: string;
      timestamp: string;
      workoutName: string;
      liftName: string;
      prescription: string;
      value: string;
    };

export interface DailyExport {
  date: string;
  events: ProgressEvent[];
  pt: {
    reviews: Extract<ProgressEvent, { type: 'pt_card_review' }>[];
    learned: Extract<ProgressEvent, { type: 'pt_card_review' }>[];
    hard: Extract<ProgressEvent, { type: 'pt_card_review' }>[];
  };
  workout: {
    completed: Extract<ProgressEvent, { type: 'workout_completed' }>[];
    lifts: Extract<ProgressEvent, { type: 'workout_lift' }>[];
  };
}

function dayKey(date: string) {
  return `progress:${date}`;
}

export async function saveProgressEvent(event: ProgressEvent) {
  await kv.lpush(dayKey(event.date), JSON.stringify(event));
  await kv.sadd('progress:dates', event.date);
}

export async function getProgressEvents(date: string): Promise<ProgressEvent[]> {
  const raw = await kv.lrange<string>(dayKey(date), 0, -1);
  return raw
    .map(item => {
      try {
        return JSON.parse(item) as ProgressEvent;
      } catch {
        return null;
      }
    })
    .filter((event): event is ProgressEvent => Boolean(event))
    .reverse();
}

export function summarizeDailyEvents(date: string, events: ProgressEvent[]): DailyExport {
  const exportableEvents = events.filter(event => event.type !== 'pt_card_review' || !event.cardId.startsWith('test:'));
  const reviews = exportableEvents.filter((event): event is Extract<ProgressEvent, { type: 'pt_card_review' }> => event.type === 'pt_card_review');
  const completed = exportableEvents.filter((event): event is Extract<ProgressEvent, { type: 'workout_completed' }> => event.type === 'workout_completed');
  const lifts = exportableEvents.filter((event): event is Extract<ProgressEvent, { type: 'workout_lift' }> => event.type === 'workout_lift');

  const latestByCard = new Map<string, Extract<ProgressEvent, { type: 'pt_card_review' }>>();
  reviews.forEach(review => latestByCard.set(review.cardId, review));
  const latestReviews = Array.from(latestByCard.values());

  return {
    date,
    events: exportableEvents,
    pt: {
      reviews,
      learned: latestReviews.filter(review => review.learned || review.rating === 'easy'),
      hard: latestReviews.filter(review => review.rating === 'hard' || review.rating === 'again'),
    },
    workout: { completed, lifts },
  };
}
