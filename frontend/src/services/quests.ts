import { xpService } from './xp';

export interface QuestItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  current: number;
  target: number;
  xpReward: number;
  completed: boolean;
  jumpRoute: string;
  jumpLabel: string;
}

export interface WeekDayStatus {
  label: string;
  dateStr: string;
  isToday: boolean;
  completed: boolean;
  isFrozen: boolean;
}

export interface DailyQuestState {
  date: string;
  quests: QuestItem[];
  claimed: boolean;
  streakDays: number;
  hasStreakFreeze: boolean;
  lastActiveDate: string;
  weekDays: WeekDayStatus[];
}

const STORAGE_KEY_PREFIX = 'recall_quests_';
const STREAK_KEY = 'recall_streak_info';

interface StreakStorage {
  streakDays: number;
  lastActiveDate: string;
  historyDates: string[];
  freezeUsedDates: string[];
}

class QuestService {
  private getTodayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private getStreakInfo(): StreakStorage {
    if (typeof window === 'undefined') {
      return { streakDays: 0, lastActiveDate: '', historyDates: [], freezeUsedDates: [] };
    }
    const saved = localStorage.getItem(STREAK_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Clean legacy hardcoded 5-day mock for fresh playtest accuracy
        if (parsed.streakDays === 5 && (!parsed.historyDates || parsed.historyDates.length <= 1)) {
          const clean: StreakStorage = {
            streakDays: 0,
            lastActiveDate: '',
            historyDates: [],
            freezeUsedDates: []
          };
          localStorage.setItem(STREAK_KEY, JSON.stringify(clean));
          return clean;
        }
        return parsed;
      } catch {}
    }
    const initial: StreakStorage = {
      streakDays: 0,
      lastActiveDate: '',
      historyDates: [],
      freezeUsedDates: []
    };
    localStorage.setItem(STREAK_KEY, JSON.stringify(initial));
    return initial;
  }

  private saveStreakInfo(info: StreakStorage) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STREAK_KEY, JSON.stringify(info));
    window.dispatchEvent(new CustomEvent('recall:streak-changed', { detail: info }));
  }

  public getWeekDays(historyDates: string[], freezeDates: string[]): WeekDayStatus[] {
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday
    // Distance from Monday
    const distanceToMonday = (currentDayOfWeek + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMonday);

    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const week: WeekDayStatus[] = [];
    const todayStr = this.getTodayKey();

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = d.toISOString().slice(0, 10);

      week.push({
        label: labels[i],
        dateStr: dStr,
        isToday: dStr === todayStr,
        completed: historyDates.includes(dStr),
        isFrozen: freezeDates.includes(dStr)
      });
    }

    return week;
  }

  public getState(): DailyQuestState {
    const today = this.getTodayKey();
    const streakInfo = this.getStreakInfo();
    const hasFreeze = xpService.hasStreakFreeze();
    const weekDays = this.getWeekDays(streakInfo.historyDates, streakInfo.freezeUsedDates);

    if (typeof window === 'undefined') {
      return this.getDefaultState(today, streakInfo.streakDays, hasFreeze, weekDays);
    }

    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${today}`);
    if (saved) {
      try {
        const parsed: DailyQuestState = JSON.parse(saved);
        return {
          ...parsed,
          streakDays: streakInfo.streakDays,
          hasStreakFreeze: hasFreeze,
          lastActiveDate: streakInfo.lastActiveDate,
          weekDays
        };
      } catch {}
    }

    const newState = this.getDefaultState(today, streakInfo.streakDays, hasFreeze, weekDays);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${today}`, JSON.stringify(newState));
    return newState;
  }

  private getDefaultState(today: string, streak: number, freeze: boolean, weekDays: WeekDayStatus[]): DailyQuestState {
    return {
      date: today,
      claimed: false,
      streakDays: streak,
      hasStreakFreeze: freeze,
      lastActiveDate: today,
      weekDays,
      quests: [
        {
          id: 'flashcard_review',
          title: 'Memory Flashcards',
          description: 'Review at least 5 concept flashcards in your active study collection.',
          icon: '🃏',
          current: 0,
          target: 5,
          xpReward: 15,
          completed: false,
          jumpRoute: '/',
          jumpLabel: '🃏 Review Flashcards'
        },
        {
          id: 'learning_unit',
          title: 'Stepping Stone',
          description: 'Conquer 1 substantive stepping stone on your 3D learning quest path.',
          icon: '🗺️',
          current: 0,
          target: 1,
          xpReward: 20,
          completed: false,
          jumpRoute: '/',
          jumpLabel: '🗺️ Continue Learning Path'
        },
        {
          id: 'quiz_mastery',
          title: 'Exam Hall Star',
          description: 'Score 70% or higher on an Examination Simulator or Practice Quiz.',
          icon: '⚡',
          current: 0,
          target: 1,
          xpReward: 25,
          completed: false,
          jumpRoute: '/',
          jumpLabel: '⚡ Start Exam Simulator'
        }
      ]
    };
  }

  private saveState(state: DailyQuestState) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${state.date}`, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('recall:quests-changed', { detail: state }));
  }

  public recordActivity(): { savedByFreeze: boolean; streak: number } {
    const today = this.getTodayKey();
    const streakInfo = this.getStreakInfo();
    let savedByFreeze = false;

    if (streakInfo.lastActiveDate === today) {
      if (streakInfo.streakDays === 0) {
        streakInfo.streakDays = 1;
      }
      if (!streakInfo.historyDates.includes(today)) {
        streakInfo.historyDates.push(today);
        this.saveStreakInfo(streakInfo);
      }
      return { savedByFreeze: false, streak: streakInfo.streakDays };
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (streakInfo.lastActiveDate === yesterday) {
      // Continued streak!
      streakInfo.streakDays = Math.max(1, streakInfo.streakDays + 1);
      streakInfo.lastActiveDate = today;
      if (!streakInfo.historyDates.includes(today)) {
        streakInfo.historyDates.push(today);
      }
    } else {
      // Missed yesterday or fresh student! Check for Streak Freeze if active streak existed
      if (streakInfo.streakDays > 0 && xpService.hasStreakFreeze()) {
        xpService.useStreakFreeze();
        streakInfo.freezeUsedDates.push(yesterday);
        streakInfo.streakDays += 1;
        streakInfo.lastActiveDate = today;
        streakInfo.historyDates.push(today);
        savedByFreeze = true;
      } else {
        streakInfo.streakDays = 1;
        streakInfo.lastActiveDate = today;
        if (!streakInfo.historyDates.includes(today)) {
          streakInfo.historyDates.push(today);
        }
      }
    }

    this.saveStreakInfo(streakInfo);
    return { savedByFreeze, streak: streakInfo.streakDays };
  }

  public recordProgress(questId: string, increment = 1) {
    this.recordActivity();
    const state = this.getState();
    const q = state.quests.find(item => item.id === questId);
    if (!q || q.completed) return;

    q.current = Math.min(q.target, q.current + increment);
    if (q.current >= q.target) {
      q.completed = true;
    }
    this.saveState(state);
  }

  public recordQuizScore(score: number) {
    this.recordActivity();
    if (score >= 70) {
      this.recordProgress('quiz_mastery', 1);
    }
  }

  public claimReward(): { xp: number; bonusFreeze: boolean } | null {
    const state = this.getState();
    const allCompleted = state.quests.every(q => q.completed);
    if (!allCompleted || state.claimed) return null;

    const totalXp = state.quests.reduce((acc, q) => acc + q.xpReward, 0) + 25; // +25 daily chest bonus
    state.claimed = true;
    xpService.awardXp(totalXp, 'Daily Quest Chest Claimed 🎁');
    this.saveState(state);

    return { xp: totalXp, bonusFreeze: true };
  }
}

export const questService = new QuestService();
