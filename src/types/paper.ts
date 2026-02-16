export type PersonaType = 'expert' | 'student' | 'reviewer' | 'journalist' | 'general';

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  doi?: string;
  publication_date?: string;
  journal?: string;
  pdf_url?: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface PaperSection {
  id: string;
  paper_id: string;
  title: string;
  content: string;
  order: number;
  section_type: 'abstract' | 'introduction' | 'methods' | 'results' | 'discussion' | 'conclusion' | 'references';
}

export interface Annotation {
  id: string;
  paper_id: string;
  user_id: string;
  section_id?: string;
  content: string;
  annotation_type: 'note' | 'question' | 'highlight' | 'critique';
  created_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string;
  bio?: string;
  institution?: string;
  avatar_url?: string;
  research_interests?: string[];
  created_at: string;
}

export interface RadarMetric {
  category: string;
  score: number;
  fullMark: number;
}
