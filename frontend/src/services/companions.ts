export interface Companion {
  id: string;
  name: string;
  category: 'vip' | 'pet' | 'friend';
  subtitle: string;
  avatarIcon: string;
  avatarImageUrl?: string;
  badgeText: string;
  badgeColor: string;
  cheerQuotes: string[];
}

export const INITIAL_COMPANIONS: Companion[] = [
  // Priority 1: VIP (Girlfriend & Founder)
  {
    id: 'nandhini',
    name: 'Nandhini',
    category: 'vip',
    subtitle: 'Your #1 Supporter ❤️',
    avatarIcon: '👑',
    avatarImageUrl: '/avatars/nandhini.jpg',
    badgeText: 'VIP CHEERLEADER',
    badgeColor: '#ff4b4b',
    cheerQuotes: [
      "You've got this babe! Keep going! ❤️",
      "Look at you being so smart! Proud of you!",
      "Don't give up! Just one more unit and then treat yourself!",
      "Locked in! I believe in you so much! ✨",
      "Yayyy! You're crushing this syllabus!"
    ]
  },
  {
    id: 'founder',
    name: 'You (Champion)',
    category: 'vip',
    subtitle: 'Focused & Determined',
    avatarIcon: '⚡',
    avatarImageUrl: '/avatars/founder.jpg',
    badgeText: 'LEARNER',
    badgeColor: '#1cb0f6',
    cheerQuotes: [
      "Locked in. Let's master this concept.",
      "Consistency beats cramming every single time.",
      "One stepping stone closer to exam mastery.",
      "Building real knowledge, step by step."
    ]
  },

  // Priority 2: Pets
  {
    id: 'sydney',
    name: 'Sydney',
    category: 'pet',
    subtitle: 'American Golden Retriever',
    avatarIcon: '🐕',
    badgeText: 'GOLDEN BUDDY',
    badgeColor: '#ffc800',
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
    avatarImageUrl: '/avatars/connie.jpg',
    badgeText: 'PRECISION CAT',
    badgeColor: '#ce82ff',
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
    avatarImageUrl: '/avatars/scooby.jpg',
    badgeText: 'WISE GUARDIAN',
    badgeColor: '#64748b',
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
    cheerQuotes: [
      "*Bouncing with joy!* Level up! That was brilliant!",
      "Energy is soaring! Let's conquer the next stepping stone!",
      "High five! You're unstoppable right now!"
    ]
  }
];

class CompanionService {
  private activeId: string = 'nandhini'; // Nandhini is default VIP companion!

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('recall_active_companion');
      if (saved) {
        this.activeId = saved;
      }
    }
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
    return list.find(c => c.id === this.activeId) || list[0];
  }

  public setActiveCompanion(id: string) {
    this.activeId = id;
    if (typeof window !== 'undefined') {
      localStorage.setItem('recall_active_companion', id);
    }
  }

  public addFriendCompanion(name: string, nickname: string, cheer: string, avatarUrl?: string): Companion {
    const newFriend: Companion = {
      id: `friend_${Date.now()}`,
      name,
      category: 'friend',
      subtitle: nickname || 'Friend & Study Mate',
      avatarIcon: '🧑‍🎓',
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
    if (!c || !c.cheerQuotes.length) return "Keep cooking! You got this! 🔥";
    return c.cheerQuotes[Math.floor(Math.random() * c.cheerQuotes.length)];
  }
}

export const companionService = new CompanionService();

