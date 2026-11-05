import { xpService } from './xp';
import { questService } from './quests';

export interface Friend {
  id: string;
  name: string;
  email: string;
  streak: number;
  weeklyXp: number;
  avatarUrl?: string;
  avatarIcon: string;
  cheerleaderName: string;
  cheerleaderBadge: string;
  highFivedToday: boolean;
}

export interface FriendRequest {
  id: string;
  fromName: string;
  fromEmail: string;
  avatarIcon: string;
  timestamp: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatarUrl?: string;
  avatarIcon: string;
  cheerleader: string;
  streak: number;
  weeklyXp: number;
  isCurrentUser: boolean;
  tier: 'gold' | 'silver' | 'bronze';
}

const STORAGE_FRIENDS_KEY = 'recall_friends_list';
const STORAGE_REQUESTS_KEY = 'recall_friend_requests';

const INITIAL_FRIENDS: Friend[] = [
  {
    id: 'f_nandhini',
    name: 'Nandhini S.',
    email: 'nandhini@recall.local',
    streak: 7,
    weeklyXp: 940,
    avatarUrl: '/avatars/nandhini_3d.png',
    avatarIcon: '⭐',
    cheerleaderName: 'Nandhini',
    cheerleaderBadge: 'TOP CHEERLEADER',
    highFivedToday: false
  },
  {
    id: 'f_rohan',
    name: 'Rohan Mehta',
    email: 'rohan.m@gmail.com',
    streak: 5,
    weeklyXp: 680,
    avatarIcon: '🧑‍💻',
    cheerleaderName: 'Sydney',
    cheerleaderBadge: 'GOLDEN BUDDY',
    highFivedToday: false
  },
  {
    id: 'f_aditi',
    name: 'Aditi Kulkarni',
    email: 'aditi.k@outlook.com',
    streak: 4,
    weeklyXp: 510,
    avatarIcon: '👩‍🔬',
    cheerleaderName: 'Connie',
    cheerleaderBadge: 'PRECISION CAT',
    highFivedToday: false
  },
  {
    id: 'f_siddharth',
    name: 'Siddharth Patel',
    email: 'sid.patel@gmail.com',
    streak: 6,
    weeklyXp: 420,
    avatarIcon: '⚡',
    cheerleaderName: 'Milo',
    cheerleaderBadge: 'STREET-SMART',
    highFivedToday: false
  }
];

const INITIAL_REQUESTS: FriendRequest[] = [
  {
    id: 'req_tanvi',
    fromName: 'Tanvi Deshmukh',
    fromEmail: 'tanvi.d@mitwpu.edu',
    avatarIcon: '🎓',
    timestamp: '2 hours ago'
  }
];

class FriendService {
  public getFriends(): Friend[] {
    if (typeof window === 'undefined') return INITIAL_FRIENDS;
    const saved = localStorage.getItem(STORAGE_FRIENDS_KEY);
    if (!saved) {
      this.saveFriends(INITIAL_FRIENDS);
      return INITIAL_FRIENDS;
    }
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_FRIENDS;
    }
  }

  private saveFriends(friends: Friend[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_FRIENDS_KEY, JSON.stringify(friends));
    window.dispatchEvent(new CustomEvent('recall:friends-changed', { detail: friends }));
  }

  public getIncomingRequests(): FriendRequest[] {
    if (typeof window === 'undefined') return INITIAL_REQUESTS;
    const saved = localStorage.getItem(STORAGE_REQUESTS_KEY);
    if (!saved) {
      this.saveRequests(INITIAL_REQUESTS);
      return INITIAL_REQUESTS;
    }
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_REQUESTS;
    }
  }

  private saveRequests(requests: FriendRequest[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_REQUESTS_KEY, JSON.stringify(requests));
    window.dispatchEvent(new CustomEvent('recall:friend-requests-changed', { detail: requests }));
  }

  public sendFriendRequest(query: string): { success: boolean; message: string } {
    const clean = query.trim().toLowerCase();
    if (!clean) return { success: false, message: 'Please enter a name or email.' };

    const friends = this.getFriends();
    if (friends.some(f => f.email.toLowerCase() === clean || f.name.toLowerCase() === clean)) {
      return { success: false, message: 'You are already study friends!' };
    }

    // Create new friend immediately for seamless playtest experience
    const displayName = clean.includes('@') ? clean.split('@')[0] : query.trim();
    const newFriend: Friend = {
      id: 'f_' + Date.now(),
      name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
      email: clean.includes('@') ? clean : `${clean}@playtest.local`,
      streak: Math.floor(Math.random() * 4) + 1,
      weeklyXp: Math.floor(Math.random() * 300) + 150,
      avatarIcon: '🎒',
      cheerleaderName: 'Sydney',
      cheerleaderBadge: 'STUDY BUDDY',
      highFivedToday: false
    };

    this.saveFriends([newFriend, ...friends]);
    return { success: true, message: `🎉 Friend added! ${newFriend.name} is now on your Leaderboard.` };
  }

  public acceptRequest(requestId: string): void {
    const requests = this.getIncomingRequests();
    const req = requests.find(r => r.id === requestId);
    if (!req) return;

    const friends = this.getFriends();
    const newFriend: Friend = {
      id: 'f_' + Date.now(),
      name: req.fromName,
      email: req.fromEmail,
      streak: 3,
      weeklyXp: 350,
      avatarIcon: req.avatarIcon,
      cheerleaderName: 'Sydney',
      cheerleaderBadge: 'FRIEND',
      highFivedToday: false
    };

    this.saveFriends([newFriend, ...friends]);
    this.saveRequests(requests.filter(r => r.id !== requestId));
  }

  public declineRequest(requestId: string): void {
    const requests = this.getIncomingRequests().filter(r => r.id !== requestId);
    this.saveRequests(requests);
  }

  public sendHighFive(friendId: string): boolean {
    const friends = this.getFriends();
    let updated = false;
    const next = friends.map(f => {
      if (f.id === friendId && !f.highFivedToday) {
        updated = true;
        return { ...f, highFivedToday: true };
      }
      return f;
    });

    if (updated) {
      this.saveFriends(next);
      xpService.awardXp(5, 'Sent High-Five to Study Friend ✋');
      return true;
    }
    return false;
  }

  public getLeaderboard(filter: 'all' | 'friends' = 'all'): LeaderboardEntry[] {
    const currentUserXp = xpService.getBalance();
    const currentUserStreak = questService.getState().streakDays;

    const currentUserEntry: LeaderboardEntry = {
      rank: 1,
      userId: 'current_user',
      name: 'You (Champion)',
      avatarUrl: '/avatars/founder_3d.png',
      avatarIcon: '⚡',
      cheerleader: 'You (Champion)',
      streak: currentUserStreak,
      weeklyXp: currentUserXp,
      isCurrentUser: true,
      tier: 'gold'
    };

    const friends = this.getFriends();
    const friendEntries: LeaderboardEntry[] = friends.map(f => ({
      rank: 2,
      userId: f.id,
      name: f.name,
      avatarUrl: f.avatarUrl,
      avatarIcon: f.avatarIcon,
      cheerleader: f.cheerleaderName,
      streak: f.streak,
      weeklyXp: f.weeklyXp,
      isCurrentUser: false,
      tier: 'gold'
    }));

    let combined = [currentUserEntry, ...friendEntries];

    if (filter === 'all') {
      const extraRivals: LeaderboardEntry[] = [
        {
          rank: 99,
          userId: 'rival_alex',
          name: 'Alex Chen',
          avatarIcon: '🚀',
          cheerleader: 'Duo Owl',
          streak: 12,
          weeklyXp: 810,
          isCurrentUser: false,
          tier: 'gold'
        },
        {
          rank: 99,
          userId: 'rival_priya',
          name: 'Priya Nair',
          avatarIcon: '📚',
          cheerleader: 'Archimedes',
          streak: 9,
          weeklyXp: 590,
          isCurrentUser: false,
          tier: 'gold'
        }
      ];
      combined = [...combined, ...extraRivals];
    }

    // Sort descending by XP
    combined.sort((a, b) => b.weeklyXp - a.weeklyXp);

    // Assign 1-indexed ranks
    return combined.map((entry, idx) => ({
      ...entry,
      rank: idx + 1
    }));
  }
}

export const friendService = new FriendService();
