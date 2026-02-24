export interface Lecture {
  id: string;
  title: string;
  transcript: string;
  created_at: string;
  user_id: string | null;
}

export interface CornellNotes {
  keyPoints: { point: string; details: string }[];
  summary: string;
}

export interface Flashcard {
  question: string;
  answer: string;
}

export interface Chunk {
  chunk_id: number;
  content: string;
}

export interface StudyKit {
  id: string;
  lecture_id: string;
  cornell_notes: CornellNotes;
  flashcards: Flashcard[];
  mindmap: string;
  chunks: Chunk[];
  created_at: string;
}
