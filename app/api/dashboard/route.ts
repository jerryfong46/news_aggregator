import { NextResponse } from 'next/server';
import {
  fetchDashboard,
  fetchDigest,
  fetchPortugueseMethod,
  fetchWeeklyLesson,
  fetchWorkoutProgram,
} from '@/lib/github';
import {
  getDateInfo, getWeekKey, getAttentionReset,
  getWorkout, parsePTData, fetchWeather,
  parseDigest, parseOpenItems, getJoeyWeight, enrichWorkout,
} from '@/lib/dashboard';

export const revalidate = 300;

export async function GET() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' }));
  const dateInfo = getDateInfo(now);
  const weekKey = getWeekKey(now);
  const previousWeekKey = getWeekKey(new Date(now.getTime() - 7 * 86400000));
  const reset = getAttentionReset(now);

  const [
    weatherData,
    digestRaw,
    dashboardRaw,
    lessonRaw,
    previousLessonRaw,
    workoutProgramRaw,
    portugueseMethodRaw,
  ] = await Promise.all([
    fetchWeather(),
    fetchDigest(dateInfo.iso),
    fetchDashboard(),
    fetchWeeklyLesson(weekKey),
    fetchWeeklyLesson(previousWeekKey),
    fetchWorkoutProgram(),
    fetchPortugueseMethod(),
  ]);

  const lessonForUi = lessonRaw ?? previousLessonRaw;
  const lessonStatus = lessonRaw ? 'current' : previousLessonRaw ? 'fallback' : 'missing';
  const portuguese = parsePTData(dateInfo.weekdayIndex, weekKey, lessonForUi, lessonStatus, portugueseMethodRaw);
  const workout = enrichWorkout(getWorkout(dateInfo.weekdayIndex), workoutProgramRaw);
  const digest = digestRaw ? parseDigest(digestRaw, dateInfo.iso) : null;
  const openItems = dashboardRaw ? parseOpenItems(dashboardRaw, dateInfo.iso) : null;
  const joeyWeight = dashboardRaw ? getJoeyWeight(dashboardRaw) : '5.345 kg';

  return NextResponse.json({
    date: dateInfo,
    reset,
    joey: { weight: joeyWeight },
    weather: weatherData,
    workout,
    transit: {
      show: dateInfo.isOfficeDay,
      toUnion: ['6:07', '7:08', '7:38'],
      toRichmondHill: ['3:45', '4:45', '5:15'],
    },
    portuguese,
    digest,
    openItems,
  });
}
