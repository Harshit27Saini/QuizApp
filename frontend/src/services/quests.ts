export interface QuestItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  current: number;
  target: number;
  xpReward: number;
  completed: boolean;
}

export interface DailyQuestState {
  date: string;
  quests: QuestItem[];
  claimed: boolean;
  streakDays: number;
  hasStreakFreeze: boolean;
}

class QuestService {
  private getTodayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  public getState(): DailyQuestState {
    const today = this.getTodayKey();
    if (typeof window === 'undefined') {
      return this.getDefaultState(today);
    }

    const saved = localStorage.getItem(`recall_quests_${today}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }

    // Initialize today's state
    const prevStreak = Number(localStorage.getItem('recall_streak_days') || '5');
    const hasFreeze = localStorage.getItem('recall_streak_freeze') === 'true';

    const newState = this.getDefaultState(today, prevStreak, hasFreeze);
    localStorage.setItem(`recall_quests_${today}`, JSON.stringify(newState));
    return newState;
  }

  private getDefaultState(today: string, streak = 5, freeze = false): DailyQuestState {
    return {
      date: today,
      claimed: false,
      streakDays: streak,
      hasStreakFreeze: freeze,
      quests: [
        {
          id: 'read_pages',
          title: 'Document Scholar',
          description: 'Read or highlight 3 pages in PDF Reader',
          icon: '📖',
          current: 1,
          target: 3,
          xpReward: 15,
          completed: false
        },
        {
          id: 'learning_unit',
          title: 'Stepping Stone',
          description: 'Complete 1 Learning Path stepping unit',
          icon: '🗺️',
          current: 0,
          target: 1,
          xpReward: 20,
          completed: false
        },
        {
          id: 'quiz_mastery',
          title: 'Exam Hall Star',
          description: 'Score 80%+ on an Exam or Quiz',
          icon: '⚡',
          current: 0,
          target: 1,
          xpReward: 25,
          completed: false
        }
      ]
    };
  }

  private saveState(state: DailyQuestState) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`recall_quests_${state.date}`, JSON.stringify(state));
    localStorage.setItem('recall_streak_days', String(state.streakDays));
    localStorage.setItem('recall_streak_freeze', String(state.hasStreakFreeze));
  }

  public recordProgress(questId: string, increment = 1) {
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
    if (score >= 80) {
      this.recordProgress('quiz_mastery', 1);
    }
  }

  public claimReward(): { xp: number; bonusFreeze: boolean } | null {
    const state = this.getState();
    const allCompleted = state.quests.every(q => q.completed);
    if (!allCompleted || state.claimed) return null;

    const totalXp = state.quests.reduce((acc, q) => acc + q.xpReward, 0) + 25; // +25 daily chest bonus
    state.claimed = true;
    state.hasStreakFreeze = true; // Awards a Streak Freeze shield
    this.saveState(state);

    return { xp: totalXp, bonusFreeze: true };
  }
}

export const questService = new QuestService();

