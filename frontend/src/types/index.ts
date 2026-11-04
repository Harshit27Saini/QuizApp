export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  xp: number;
}

export interface Collection {
  id: string;
  user_id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentSection {
  id: string;
  document_id: string;
  section_index: number;
  page_number: number | null;
  heading: string;
  content: string;
  token_estimate: number;
  created_at: string;
}

export interface StudyDocument {
  id: string;
  collection_id: string;
  user_id: string;
  filename: string;
  file_type: 'pdf' | 'docx' | 'pptx' | 'txt';
  file_size_bytes: number;
  storage_path: string;
  total_pages: number;
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  error_message?: string;
  created_at: string;
  sections?: DocumentSection[];
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuestionPublic {
  id: string;
  quiz_id: string;
  question_type: 'MCQ' | 'MSQ';
  prompt: string;
  options: QuestionOption[];
  difficulty: 'easy' | 'medium' | 'hard';
  source_page?: number;
}

export interface QuestionDetail extends QuestionPublic {
  correct_answers: string[];
  explanation: string;
  source_document_id?: string;
  source_quote?: string;
}

export interface Quiz {
  id: string;
  user_id: string;
  collection_id?: string;
  title: string;
  mode: 'STRICT' | 'CONCEPTUAL';
  difficulty: 'easy' | 'medium' | 'hard';
  created_at: string;
  questions?: QuestionPublic[];
}

export interface QuestionAnswerSubmission {
  question_id: string;
  selected_options: string[];
  time_spent_seconds: number;
}

export interface AttemptSubmitRequest {
  quiz_id: string;
  time_taken_seconds: number;
  answers: QuestionAnswerSubmission[];
  is_retry?: boolean;
  parent_attempt_id?: string;
}

export interface EvaluatedQuestionResult {
  question: QuestionDetail;
  selected_options: string[];
  is_correct: boolean;
  time_spent_seconds: number;
}

export interface AttemptResult {
  id: string;
  quiz_id: string;
  user_id: string;
  is_retry: boolean;
  parent_attempt_id?: string;
  score: number;
  total_questions: number;
  correct_count: number;
  time_taken_seconds: number;
  xp_earned: number;
  started_at: string;
  completed_at?: string;
  question_results: EvaluatedQuestionResult[];
}

export interface FlashcardItem {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  source_page?: number;
  source_quote?: string;
  tags: string[];
  mastered: boolean;
  created_at: string;
}

export interface FlashcardDeck {
  id: string;
  user_id: string;
  collection_id: string;
  title: string;
  document_ids: string[];
  created_at: string;
  cards?: FlashcardItem[];
}
