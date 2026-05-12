import { NextResponse } from 'next/server';
import {
  fetchDashboard,
  fetchAttentionResetDailyLog,
  fetchDigest,
  fetchPortugueseFrequencyMasterList,
  fetchPortugueseMethod,
  fetchPortugueseStory,
  fetchWeeklyLesson,
  fetchWorkoutProgram,
} from '@/lib/github';
import {
  getDateInfo, getWeekKey, getAttentionReset,
  getWorkout, parsePTData, fetchWeather,
  parseDigest, parseOpenItems, getJoeyWeight, enrichWorkout, parseStoryMarkdown, enrichCueCardExamples,
  parseAttentionResetDailyLog,
} from '@/lib/dashboard';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

export async function GET() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' }));
  const dateInfo = getDateInfo(now);
  const yesterdayInfo = getDateInfo(new Date(now.getTime() - 86400000));
  const weekKey = getWeekKey(now);
  const previousWeekKey = getWeekKey(new Date(now.getTime() - 7 * 86400000));
  const reset = getAttentionReset(now);

  const [
    weatherData,
    digestRaw,
    yesterdayDigestRaw,
    dashboardRaw,
    attentionResetLogRaw,
    lessonRaw,
    previousLessonRaw,
    workoutProgramRaw,
    portugueseMethodRaw,
    frequencyRaw,
  ] = await Promise.all([
    fetchWeather(),
    fetchDigest(dateInfo.iso),
    fetchDigest(yesterdayInfo.iso),
    fetchDashboard(),
    fetchAttentionResetDailyLog(),
    fetchWeeklyLesson(weekKey),
    fetchWeeklyLesson(previousWeekKey),
    fetchWorkoutProgram(),
    fetchPortugueseMethod(),
    fetchPortugueseFrequencyMasterList(),
  ]);

  const lessonForUi = lessonRaw ?? previousLessonRaw;
  const lessonStatus = lessonRaw ? 'current' : previousLessonRaw ? 'fallback' : 'missing';
  const portugueseBase = parsePTData(dateInfo.weekdayIndex, weekKey, lessonForUi, lessonStatus, portugueseMethodRaw, frequencyRaw);
  const storyContents = await Promise.all(portugueseBase.stories.map(story => fetchPortugueseStory(story.title)));
  const portuguese = {
    ...portugueseBase,
    stories: portugueseBase.stories.map((story, index) => parseStoryMarkdown(story.title, storyContents[index])),
  };
  portuguese.cueCards = enrichCueCardExamples(portuguese.cueCards, portuguese.stories);
  const workout = enrichWorkout(getWorkout(dateInfo.weekdayIndex), workoutProgramRaw);
  const digest = digestRaw
    ? { ...parseDigest(digestRaw, dateInfo.iso), sourceDate: dateInfo.iso, isFallback: false }
    : yesterdayDigestRaw
      ? { ...parseDigest(yesterdayDigestRaw, yesterdayInfo.iso), sourceDate: yesterdayInfo.iso, isFallback: true }
      : null;
  const openItems = dashboardRaw ? parseOpenItems(dashboardRaw, dateInfo.iso) : null;
  const joeyWeight = dashboardRaw ? getJoeyWeight(dashboardRaw) : '5.345 kg';
  const attentionReset = parseAttentionResetDailyLog(attentionResetLogRaw, reset.day);

  return NextResponse.json({
    date: dateInfo,
    reset,
    attentionReset,
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
