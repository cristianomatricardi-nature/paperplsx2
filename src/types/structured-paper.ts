import type { Author } from './database';

export interface StructuredPaper {
  metadata: PaperMetadata;
  abstract: string;
  sections: Section[];
  claims: Claim[];
  methods: MethodStep[];
  figures: Figure[];
  tables_data: TableData[];
  equations: Equation[];
  negative_results: NegativeResult[];
  call_to_actions: CallToAction[];
  scicomm_hooks: ScicommHook[];
  references_list: Reference[];
}

export interface PaperMetadata {
  title: string;
  authors: Author[];
  doi: string | null;
  journal: string | null;
  publication_date: string | null;
  keywords: string[];
  field: string | null;
  subfield: string | null;
}

export interface Section {
  id: string;
  heading: string;
  level: number;
  content: string;
  page_numbers: number[];
}

export interface Claim {
  id: string;
  statement: string;
  evidence_summary: string;
  strength: 'strong' | 'moderate' | 'preliminary' | 'speculative';
  supporting_data: string;
  page_numbers: number[];
  related_figure_ids: string[];
  related_method_ids: string[];
}

export interface MethodStep {
  id: string;
  title: string;
  description: string;
  tools: string[];
  reagents: string[];
  software: string[];
  conditions: string[];
  duration: string | null;
  page_numbers: number[];
  critical_notes: string[];
}

export interface Figure {
  id: string;
  caption: string;
  figure_type: string;
  page_number: number;
  description: string;
  key_findings: string[];
  data_series: string[];
  image_url: string | null;
  bounding_box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface TableData {
  id: string;
  caption: string;
  headers: string[];
  summary: string;
  page_number: number;
}

export interface Equation {
  id: string;
  raw_text: string;
  context: string;
  page_number: number;
}

export interface NegativeResult {
  id: string;
  description: string;
  hypothesis_tested: string;
  why_it_matters: string;
  page_numbers: number[];
}

export interface CallToAction {
  id: string;
  action: string;
  target_audience: string;
  urgency: 'high' | 'medium' | 'low';
  page_numbers: number[];
}

export interface ScicommHook {
  id: string;
  hook_type: 'analogy' | 'real_world_impact' | 'surprising_finding' | 'human_story';
  content: string;
  target_audience: string;
}

export interface Reference {
  id: string;
  title: string;
  authors: string;
  year: string | null;
  doi: string | null;
  context: string;
}
