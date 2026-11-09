import type {
  Collection,
  StudyDocument,
  Quiz,
  AttemptSubmitRequest,
  AttemptResult,
  QuestionPublic,
  UserProfile,
  FlashcardDeck,
  LearningPath,
  LearningPathGenerateOptions,
  PetProfile,
  PetChatRequest,
  PetChatResponse
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach persistent auth token if available, or unique device guest ID
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

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (_netErr: any) {
    // Retry once after 3s (in case Render is waking up from free-tier sleep or redeploying)
    try {
      await new Promise((r) => setTimeout(r, 3000));
      response = await fetch(url, { ...options, headers });
    } catch {
      throw new Error(
        'Unable to reach cloud backend. If the server is waking up or deploying, please wait a moment and refresh.'
      );
    }
  }

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // Auth & Profile
  getMyProfile: () => request<UserProfile>('/auth/me'),

  // Collections
  listCollections: () => request<Collection[]>('/collections'),
  getCollection: (id: string) => request<Collection>(`/collections/${id}`),
  createCollection: (title: string, description?: string) =>
    request<Collection>('/collections', {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    }),
  deleteCollection: (id: string) =>
    request<void>(`/collections/${id}`, { method: 'DELETE' }),

  // Documents
  listDocuments: (collectionId: string) =>
    request<StudyDocument[]>(`/collections/${collectionId}/documents`),
  getDocumentPreview: (documentId: string) =>
    request<StudyDocument>(`/documents/${documentId}`),
  getDocumentFileUrl: (documentId: string) =>
    `${API_BASE_URL}/documents/${documentId}/file`,
  uploadDocument: (collectionId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<StudyDocument>(`/collections/${collectionId}/documents`, {
      method: 'POST',
      body: formData,
    });
  },

  // Quizzes
  generateQuiz: (payload: {
    collection_id?: string;
    document_ids: string[];
    title?: string;
    mode: 'EXAMINATION' | 'STRICT' | 'CONCEPTUAL';
    difficulty: 'easy' | 'medium' | 'hard';
    question_count: number;
    question_types?: string[];
  }) =>
    request<Quiz>('/quizzes/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getQuiz: (quizId: string) => request<Quiz>(`/quizzes/${quizId}`),
  listQuizzes: () => request<Quiz[]>('/quizzes'),

  // Attempts & Grading
  submitAttempt: (payload: AttemptSubmitRequest) =>
    request<AttemptResult>('/attempts/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAttemptResult: (attemptId: string) =>
    request<AttemptResult>(`/attempts/${attemptId}`),
  getRetryQuestions: (attemptId: string) =>
    request<QuestionPublic[]>(`/attempts/${attemptId}/retry-questions`),
  listAttempts: (quizId?: string) => {
    const query = quizId ? `?quiz_id=${quizId}` : '';
    return request<AttemptResult[]>(`/attempts${query}`);
  },

  // Flashcards & Learning Cards
  generateFlashcards: (payload: {
    collection_id: string;
    document_ids: string[];
    title?: string;
    card_count?: number;
    start_slide?: number;
    end_slide?: number;
  }) =>
    request<FlashcardDeck>('/flashcards/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getFlashcardDeck: (deckId: string) =>
    request<FlashcardDeck>(`/flashcards/${deckId}`),
  listCollectionDecks: (collectionId: string) =>
    request<FlashcardDeck[]>(`/flashcards/collections/${collectionId}`),

  // Learning Paths & Substantive Curriculum
  generateLearningPath: (documentId: string, options?: LearningPathGenerateOptions) =>
    request<LearningPath>('/learning-paths/generate', {
      method: 'POST',
      body: JSON.stringify({
        document_id: documentId,
        page_start: options?.page_start,
        page_end: options?.page_end,
        section_ids: options?.section_ids,
        lesson_depth: options?.lesson_depth || 'standard',
        force_regenerate: options?.force_regenerate || false,
      }),
    }),
  getLearningPath: (pathId: string) =>
    request<LearningPath>(`/learning-paths/${pathId}`),
  completePathNode: (pathId: string, nodeId: string, answers: any[]) =>
    request<{
      passed: boolean;
      score: number;
      correct_count: number;
      total_questions: number;
      xp_awarded: number;
      path: LearningPath;
    }>(`/learning-paths/${pathId}/nodes/${nodeId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),

  // Study Companions (Sydney, Connie, Milo, Scooby, Bunny)
  listPetAssistants: () =>
    request<PetProfile[]>('/learning-paths/pets'),
  chatWithPet: (payload: PetChatRequest) =>
    request<PetChatResponse>('/learning-paths/chat-assistant', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Auth & Profile
  signup: (payload: { email: string; password: string; display_name?: string }) =>
    request<{ token: string; user: any }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: (payload: { email: string; password: string }) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  loginWithGoogle: (payload: { email: string; display_name?: string; credential?: string }) =>
    request<{ token: string; user: any }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  summarizeStone: (payload: { title: string; overview: string; mechanisms: string[]; examples: string[]; slide_label?: string }) =>
    request<{ tldr_bullets: string[]; cheat_sheet_markdown: string }>('/learning-paths/summarize-stone', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Playtest Bug Reports & Feedback
  submitFeedback: (payload: { type: string; message: string; url: string; browser_info?: string }) =>
    request<{ success: boolean; feedback: any }>('/feedback/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  listFeedback: () =>
    request<any[]>('/feedback/'),
  deleteFeedback: (id: string) =>
    request<{ success: boolean }>(`/feedback/${id}`, { method: 'DELETE' }),

  // Friends & Social
  sendFriendRequest: (targetEmail: string) =>
    request<{ success: boolean; message: string }>('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ target_email: targetEmail }),
    }),
  listFriends: () =>
    request<any[]>('/friends/'),
  listFriendRequests: () =>
    request<any[]>('/friends/requests'),
  acceptFriendRequest: (requestId: string) =>
    request<{ success: boolean; message: string }>(`/friends/requests/${requestId}/accept`, {
      method: 'POST',
    }),
  declineFriendRequest: (requestId: string) =>
    request<{ success: boolean }>(`/friends/requests/${requestId}/decline`, {
      method: 'POST',
    }),
  cheerFriend: (friendId: string) =>
    request<{ success: boolean; xp_awarded: number }>(`/friends/${friendId}/cheer`, {
      method: 'POST',
    }),
  getSocialLeaderboard: () =>
    request<any[]>('/friends/leaderboard'),

  // Founder & Developer Access
  claimFounder: (passcode: string) =>
    request<{ success: boolean; is_admin: boolean; token: string; user: any }>('/auth/claim-founder', {
      method: 'POST',
      body: JSON.stringify({ passcode }),
    }),

  // Playtester Telemetry & Dev Logs
  listTelemetryLogs: (params?: { limit?: number; user_id?: string; event_type?: string }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.user_id) q.set('user_id', params.user_id);
    if (params?.event_type) q.set('event_type', params.event_type);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<any[]>(`/telemetry/logs${qs}`);
  },
  clearTelemetryLogs: () =>
    request<{ success: boolean }>('/telemetry/logs', { method: 'DELETE' }),
  getStorageStats: () =>
    request<{
      upload_dir_exists: boolean;
      files_on_disk: number;
      total_storage_bytes: number;
      total_storage_mb: number;
      max_upload_size_mb: number;
      dedup_algorithm: string;
    }>('/telemetry/storage'),
};
