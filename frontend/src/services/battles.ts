// battles.ts — Groups & Battles API service
// Uses the same request<T>() pattern as api.ts

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('recall_auth_token');
    const founderPasscode = localStorage.getItem('recall_founder_passcode');
    if (founderPasscode && !headers.has('X-Founder-Passcode')) {
      headers.set('X-Founder-Passcode', founderPasscode);
    }
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    } else if (!token && !headers.has('X-User-Id')) {
      let guestId = localStorage.getItem('recall_guest_id');
      if (!guestId) {
        guestId = 'guest_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        localStorage.setItem('recall_guest_id', guestId);
      }
      headers.set('X-User-Id', guestId);
    }
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch { /* ignore */ }
    throw new Error(errorDetail);
  }

  if (response.status === 204) return {} as T;
  return response.json();
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Group {
  id: string;
  name: string;
  emoji: string;
  owner_id: string;
  owner_email: string;
  created_at: string;
  member_count?: number;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  email: string;
  name: string;
  role: 'owner' | 'member';
  joined_at: string;
}

export interface GroupDetail extends Group {
  members: GroupMember[];
}

export type BattleMode = '1v1' | 'nvn' | 'marathon' | 'sudden_death';

export interface Battle {
  id: string;
  group_id: string;
  mode: BattleMode;
  quiz_id?: string;
  status: 'waiting' | 'active' | 'finished';
  created_by: string;
  started_at?: string;
  finished_at?: string;
}

export interface BattleScore {
  battle_id: string;
  user_id: string;
  email: string;
  name: string;
  score: number;
  accuracy: number;
  time_taken_seconds: number;
  eliminated_at?: string;
}

export interface BattleDetail extends Battle {
  scores: BattleScore[];
}

// ─── Groups API ───────────────────────────────────────────────────────────────

export const groupsApi = {
  createGroup: async (name: string, emoji: string): Promise<Group> => {
    const res = await request<any>('/groups/', {
      method: 'POST',
      body: JSON.stringify({ name, emoji }),
    });
    return res.group || res;
  },

  listGroups: () => request<Group[]>('/groups/'),

  getGroup: (id: string) => request<GroupDetail>(`/groups/${id}`),

  inviteMember: (id: string, email: string) =>
    request<{ success: boolean; message: string }>(`/groups/${id}/invite`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  kickMember: (groupId: string, userId: string) =>
    request<{ success: boolean }>(`/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
    }),

  deleteGroup: (id: string) =>
    request<{ success: boolean }>(`/groups/${id}`, { method: 'DELETE' }),
};

// ─── Battles API ──────────────────────────────────────────────────────────────

export const battlesApi = {
  createBattle: async (group_id: string, mode: BattleMode, quiz_id?: string): Promise<Battle> => {
    const res = await request<any>('/battles/', {
      method: 'POST',
      body: JSON.stringify({ group_id, mode, quiz_id }),
    });
    return res.battle || res;
  },

  getBattle: (id: string) => request<BattleDetail>(`/battles/${id}`),

  joinBattle: (id: string) =>
    request<{ success: boolean }>(`/battles/${id}/join`, { method: 'POST' }),

  submitScore: (
    id: string,
    payload: { score: number; accuracy: number; time_taken_seconds: number }
  ) =>
    request<{ success: boolean; xp_awarded: number }>(`/battles/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listGroupBattles: (groupId: string) =>
    request<Battle[]>(`/battles/group/${groupId}`),
};
