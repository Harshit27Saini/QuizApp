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
  mode: 'EXAMINATION' | 'STRICT' | 'CONCEPTUAL';
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


export interface SubstantiveContent {
  overview: string;
  mechanisms: string[];
  examples: string[];
  distinctions?: string;
  exam_pitfalls?: string;
  source_quote?: string;
  source_page?: number;
}

export interface PathNodeQuestion {
  id: string;
  prompt: string;
  options: QuestionOption[];
  correct_answers: string[];
  explanation: string;
}

export type TrailType = 'main' | 'deep_dive' | 'trap_vault' | 'secret_vault' | 'gauntlet' | 'boss';
export type BranchDirection = 'left' | 'right';

export interface PathNode {
  id: string;
  path_id: string;
  unit_index: number;
  node_type?: 'lesson' | 'scenario' | 'checkpoint' | 'challenge_gauntlet' | 'deep_dive' | 'trap_vault' | 'secret_vault' | 'boss';
  title: string;
  concept_summary: string;
  key_takeaways: string[];
  substantive_content?: SubstantiveContent;
  source_page?: number;
  slide_start?: number;
  slide_end?: number;
  is_challenge_trail?: boolean;
  // Dungeon branching map fields
  trail_type?: TrailType;
  branch_direction?: BranchDirection;
  branch_from_unit_index?: number;
  branch_depth?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  questions: PathNodeQuestion[];
  is_completed: boolean;
  is_locked: boolean;
  score?: number;
  xp_reward: number;
}

export interface LearningPath {
  id: string;
  user_id: string;
  collection_id: string;
  document_id: string;
  title: string;
  total_units: number;
  completed_units: number;
  created_at: string;
  nodes: PathNode[];
}

export interface LearningPathGenerateOptions {
  page_start?: number;
  page_end?: number;
  section_ids?: string[];
  lesson_depth?: 'sprint' | 'standard' | 'deep_dive';
  force_regenerate?: boolean;
}

export interface PetProfile {
  id: string;
  name: string;
  breed: string;
  avatar: string;
  tagline: string;
  style: string;
}

export interface PetMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PetChatRequest {
  pet_id: string;
  user_message: string;
  current_topic?: string;
  context_text?: string;
  chat_history?: PetMessage[];
}

export interface PetChatResponse {
  pet_id: string;
  pet_name: string;
  reply: string;
  suggested_followups: string[];
}
