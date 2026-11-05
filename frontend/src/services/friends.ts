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

const INITIAL_FRIENDS: Friend[] = [];
const INITIAL_REQUESTS: FriendRequest[] = [];

class FriendService {
  public getFriends(): Friend[] {
    if (typeof window === 'undefined') return INITIAL_FRIENDS;
    try {
      const saved = localStorage.getItem(STORAGE_FRIENDS_KEY);
      if (!saved) return INITIAL_FRIENDS;
      const parsed: Friend[] = JSON.parse(saved);
      // Clean up legacy placeholder mock friends so tester sees only real friends
      if (Array.isArray(parsed) && parsed.some(f => f.id === 'f_nandhini' || f.id === 'f_rohan')) {
        localStorage.removeItem(STORAGE_FRIENDS_KEY);
        return INITIAL_FRIENDS;
      }
      return parsed;
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
    try {
      const saved = localStorage.getItem(STORAGE_REQUESTS_KEY);
      if (!saved) return INITIAL_REQUESTS;
      const parsed: FriendRequest[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.some(r => r.id === 'req_tanvi')) {
        localStorage.removeItem(STORAGE_REQUESTS_KEY);
        return INITIAL_REQUESTS;
      }
      return parsed;
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

    const displayName = clean.includes('@') ? clean.split('@')[0] : query.trim();
    const newFriend: Friend = {
      id: 'f_' + Date.now(),
      name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
      email: clean.includes('@') ? clean : `${clean}@playtest.local`,
      streak: 1,
      weeklyXp: 10,
      avatarIcon: '👤',
      cheerleaderName: 'founder',
      cheerleaderBadge: 'FRIEND',
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
      streak: 1,
      weeklyXp: 10,
      avatarIcon: req.avatarIcon || '👤',
      cheerleaderName: 'founder',
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

  public getLeaderboard(_filter: 'all' | 'friends' = 'all'): LeaderboardEntry[] {
    const currentUserXp = xpService.getBalance();
    const currentUserStreak = questService.getState().streakDays;

    let profile: any = null;
    try {
      profile = JSON.parse(localStorage.getItem('recall_user_profile') || 'null');
    } catch {}

    const userName = profile?.display_name || profile?.email?.split('@')[0] || 'You (Learner)';
    const cheerleader = profile?.cheerleader || 'You (Champion)';

    const currentUserEntry: LeaderboardEntry = {
      rank: 1,
      userId: profile?.id || 'current_user',
      name: userName,
      avatarUrl: profile?.avatarUrl || '/avatars/founder_3d.png',
      avatarIcon: '⚡',
      cheerleader: cheerleader,
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

    // Sort descending by XP
    combined.sort((a, b) => b.weeklyXp - a.weeklyXp);

    // Assign 1-indexed ranks
    return combined.map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
      tier: idx < 3 ? 'gold' : idx < 10 ? 'silver' : 'bronze'
    }));
  }
}

export const friendService = new FriendService();
