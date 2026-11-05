import { xpService } from './xp';

export interface Companion {
  id: string;
  name: string;
  category: 'vip' | 'pet' | 'friend';
  subtitle: string;
  avatarIcon: string;
  avatarImageUrl?: string;
  cartoonImageUrl?: string;
  badgeText: string;
  badgeColor: string;
  cheerQuotes: string[];
  unlockRequirement?: {
    type: 'progress' | 'xp';
    threshold?: number;
    cost?: number;
    label: string;
  };
}

export const INITIAL_COMPANIONS: Companion[] = [
  // Priority 1: Top Study Motivators
  {
    id: 'nandhini',
    name: 'Nandhini',
    category: 'vip',
    subtitle: 'Your #1 Study Mate ⭐',
    avatarIcon: '⭐',
    avatarImageUrl: '/avatars/nandhini_3d.png',
    cartoonImageUrl: '/avatars/nandhini_3d.png',
    badgeText: 'TOP CHEERLEADER',
    badgeColor: '#10b981',
    unlockRequirement: {
      type: 'progress',
      threshold: 90,
      label: 'Unlock at 90% syllabus mastery'
    },
    cheerQuotes: [
      "You've got this! Keep pushing forward! ⭐",
      "Look at you mastering these concepts! Let's go!",
      "Don't give up! Just one more unit and then take a break!",
      "Locked in! I believe in your potential! ✨",
      "Awesome work! You're completely crushing this syllabus!"
    ]
  },
  {
    id: 'founder',
    name: 'You (Champion)',
    category: 'vip',
    subtitle: 'Focused & Determined',
    avatarIcon: '⚡',
    avatarImageUrl: '/avatars/founder_3d.png',
    cartoonImageUrl: '/avatars/founder_3d.png',
    badgeText: 'LEARNER',
    badgeColor: '#1cb0f6',
    cheerQuotes: [
      "Locked in. Let's master this concept.",
      "Consistency beats cramming every single time.",
      "One stepping stone closer to exam mastery.",
      "Building real knowledge, step by step."
    ]
  },

  // Priority 2: Mascot & Scholars (Shop)
  {
    id: 'duo',
    name: 'Duo Owl',
    category: 'vip',
    subtitle: 'Mascot & Streak Guardian',
    avatarIcon: '🦉',
    badgeText: 'STREAK GUARDIAN',
    badgeColor: '#58cc02',
    unlockRequirement: {
      type: 'xp',
      cost: 600,
      label: 'Unlock for 600 XP'
    },
    cheerQuotes: [
      "Practice now or face my wrath! 🦉",
      "Streak is life. Do not break it!",
      "5 minutes of focus and you're golden! Let's crush this unit!"
    ]
  },
  {
    id: 'archimedes',
    name: 'Prof. Archimedes',
    category: 'vip',
    subtitle: 'First-Principles Scholar',
    avatarIcon: '🧙‍♂️',
    badgeText: 'DEEP SCHOLAR',
    badgeColor: '#8b5cf6',
    unlockRequirement: {
      type: 'xp',
      cost: 750,
      label: 'Unlock for 750 XP'
    },
    cheerQuotes: [
      "Eureka! First principles reveal all truths.",
      "Deconstruct the question to its foundational axioms.",
      "Brilliant deduction, scholar! Knowledge compounds."
    ]
  },

  // Priority 3: Pets
  {
    id: 'sydney',
    name: 'Sydney',
    category: 'pet',
    subtitle: 'American Golden Retriever',
    avatarIcon: '🐕',
    badgeText: 'GOLDEN BUDDY',
    badgeColor: '#ffc800',
    unlockRequirement: {
      type: 'xp',
      cost: 100,
      label: 'Unlock for 100 XP'
    },
    cheerQuotes: [
      "Woof! *Happy tail wag!* You're doing amazing!",
      "Break down the concept like a yummy treat! You got this!",
      "Streak intact! Golden retriever energy all the way!"
    ]
  },
  {
    id: 'connie',
    name: 'Connie',
    category: 'pet',
    subtitle: 'Himalayan Persian (White Fur & Brown)',
    avatarIcon: '🐈',
    avatarImageUrl: '/avatars/connie_3d.png',
    cartoonImageUrl: '/avatars/connie_3d.png',
    badgeText: 'PRECISION CAT',
    badgeColor: '#ce82ff',
    unlockRequirement: {
      type: 'xp',
      cost: 200,
      label: 'Unlock for 200 XP'
    },
    cheerQuotes: [
      "*Gentle purr.* Meticulous focus on the definitions.",
      "Elegant work. No room for sloppy errors today.",
      "Razor-sharp precision. Exactly as I expected."
    ]
  },
  {
    id: 'milo',
    name: 'Milo',
    category: 'pet',
    subtitle: 'White & Black Indie',
    avatarIcon: '🐕‍🦺',
    badgeText: 'STREET-SMART',
    badgeColor: '#58cc02',
    unlockRequirement: {
      type: 'xp',
      cost: 300,
      label: 'Unlock for 300 XP'
    },
    cheerQuotes: [
      "Street-smart trick: remember the practical feedback loop!",
      "Don't overthink it! Keep moving and keep the streak alive!",
      "Simple and clever wins the race every time!"
    ]
  },
  {
    id: 'scooby',
    name: 'Scooby',
    category: 'pet',
    subtitle: 'Grey Lhasa Apso',
    avatarIcon: '🐶',
    avatarImageUrl: '/avatars/scooby_3d.png',
    cartoonImageUrl: '/avatars/scooby_3d.png',
    badgeText: 'WISE GUARDIAN',
    badgeColor: '#64748b',
    unlockRequirement: {
      type: 'xp',
      cost: 400,
      label: 'Unlock for 400 XP'
    },
    cheerQuotes: [
      "Deep breath. We untangle complex concepts one step at a time.",
      "Steady and calm. You're building deep understanding.",
      "No rush. Focus on true comprehension."
    ]
  },
  {
    id: 'bunny',
    name: 'Bunny',
    category: 'pet',
    subtitle: 'Brown Lhasa Apso',
    avatarIcon: '🐾',
    badgeText: 'HIGH-ENERGY',
    badgeColor: '#f97316',
    unlockRequirement: {
      type: 'xp',
      cost: 500,
      label: 'Unlock for 500 XP'
    },
    cheerQuotes: [
      "*Bouncing with joy!* Level up! That was brilliant!",
      "Energy is soaring! Let's conquer the next stepping stone!",
      "High five! You're unstoppable right now!"
    ]
  }
];

class CompanionService {
  private activeId: string = 'founder';

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('recall_active_companion');
      if (saved) {
        this.activeId = saved;
      }
      // If active companion is currently locked, fallback to founder
      const active = this.getActiveCompanion();
      if (!this.isCompanionUnlocked(active)) {
        this.activeId = 'founder';
      }
    }
  }

  public getOverallProgress(): number {
    if (typeof window === 'undefined') return 0;
    const saved = localStorage.getItem('recall_highest_progress');
    return saved ? Math.min(100, Math.max(0, Number(saved))) : 0;
  }

  public setOverallProgress(progress: number): boolean {
    if (typeof window === 'undefined') return false;
    const prev = this.getOverallProgress();
    const cleanProgress = Math.min(100, Math.max(0, progress));
    if (cleanProgress > prev) {
      localStorage.setItem('recall_highest_progress', String(cleanProgress));
      // Returns true if Nandhini was just unlocked!
      if (prev < 90 && cleanProgress >= 90) {
        return true;
      }
    }
    return false;
  }

  public isCompanionUnlocked(companion: Companion): boolean {
    if (!companion.unlockRequirement) return true;
    if (companion.unlockRequirement.type === 'progress') {
      return this.getOverallProgress() >= (companion.unlockRequirement.threshold || 90);
    }
    if (companion.unlockRequirement.type === 'xp') {
      return xpService.isCompanionUnlocked(companion.id);
    }
    return true;
  }

  public getAvatarUrl(companion: Companion): string | undefined {
    return companion.cartoonImageUrl || companion.avatarImageUrl;
  }

  public listCompanions(): Companion[] {
    if (typeof window === 'undefined') return INITIAL_COMPANIONS;
    const custom = localStorage.getItem('recall_custom_friends');
    if (custom) {
      try {
        const friends: Companion[] = JSON.parse(custom);
        return [...INITIAL_COMPANIONS, ...friends];
      } catch {
        return INITIAL_COMPANIONS;
      }
    }
    return INITIAL_COMPANIONS;
  }

  public getActiveCompanion(): Companion {
    const list = this.listCompanions();
    let current = list.find(c => c.id === this.activeId);
    if (!current || !this.isCompanionUnlocked(current)) {
      current = list.find(c => c.id === 'founder') || list[0];
    }
    return current;
  }

  public setActiveCompanion(id: string): boolean {
    const list = this.listCompanions();
    const target = list.find(c => c.id === id);
    if (!target) return false;

    if (!this.isCompanionUnlocked(target)) {
      return false;
    }

    this.activeId = id;
    if (typeof window !== 'undefined') {
      localStorage.setItem('recall_active_companion', id);
    }
    return true;
  }

  public addFriendCompanion(name: string, nickname: string, cheer: string, avatarUrl?: string): Companion {
    const newFriend: Companion = {
      id: `friend_${Date.now()}`,
      name,
      category: 'friend',
      subtitle: nickname || 'Friend & Study Mate',
      avatarIcon: '🎓',
      avatarImageUrl: avatarUrl,
      badgeText: 'FRIEND',
      badgeColor: '#10b981',
      cheerQuotes: cheer ? [cheer] : ["Let's goooo! You've got this!"]
    };

    if (typeof window !== 'undefined') {
      const existing = localStorage.getItem('recall_custom_friends');
      let friends: Companion[] = [];
      if (existing) {
        try { friends = JSON.parse(existing); } catch {}
      }
      friends.push(newFriend);
      localStorage.setItem('recall_custom_friends', JSON.stringify(friends));
    }

    return newFriend;
  }

  public getRandomCheer(companionId?: string): string {
    const c = companionId ? this.listCompanions().find(x => x.id === companionId) : this.getActiveCompanion();
    if (!c || !c.cheerQuotes.length) return "Keep cooking! You got this! 🚀";
    return c.cheerQuotes[Math.floor(Math.random() * c.cheerQuotes.length)];
  }
}

export const companionService = new CompanionService();
