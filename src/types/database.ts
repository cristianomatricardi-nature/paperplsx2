export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  institution: string | null;
  bio: string | null;
  orcid: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
}

export interface Paper {
  id: number;
  user_id: string;
  title: string | null;
  authors: Author[] | null;
  abstract: string | null;
  doi: string | null;
  journal: string | null;
  publication_date: string | null;
  source_type: 'pdf_upload' | 'doi';
  storage_path: string | null;
  file_size: number | null;
  num_pages: number | null;
  status: PaperStatus;
  error_message: string | null;
  simulated_impact_scores: SimulatedImpactScores | null;
  created_at: string;
  updated_at: string;
}

export type PaperStatus = 'uploaded' | 'parsing' | 'structuring' | 'chunking' | 'extracting_figures' | 'completed' | 'failed';

export interface Author {
  name: string;
  affiliation: string | null;
  orcid: string | null;
}

export interface DigitalLabItem {
  id: number;
  user_id: string;
  item_name: string;
  item_type: 'instrument' | 'reagent' | 'software' | 'consumable' | 'condition';
  manufacturer: string | null;
  model_number: string | null;
  description: string | null;
  specifications: Record<string, any> | null;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface SimulatedImpactScores {
  conceptual_influence: number;
  methodological_adoption: number;
  policy_relevance: number;
  industry_transfer_potential: number;
  educational_value: number;
  replication_readiness: number;
}
