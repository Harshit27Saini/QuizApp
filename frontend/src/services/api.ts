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

  const response = await fetch(url, {
    ...options,
    headers,
  });

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

  // AI Pet Study Assistants (Sydney, Connie, Milo, Scooby, Bunny)
  listPetAssistants: () =>
    request<PetProfile[]>('/learning-paths/pets'),
  chatWithPet: (payload: PetChatRequest) =>
    request<PetChatResponse>('/learning-paths/chat-assistant', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
