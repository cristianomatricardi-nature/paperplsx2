export const APP_NAME = 'Paper++';
export const APP_DESCRIPTION = 'Transform static scientific PDFs into interactive, persona-tailored research articles.';

export const PERSONA_LABELS: Record<string, string> = {
  expert: 'Domain Expert',
  student: 'Graduate Student',
  reviewer: 'Peer Reviewer',
  journalist: 'Science Journalist',
  general: 'General Reader',
};

export const ROUTES = {
  HOME: '/',
  RESEARCHER_HOME: '/researcher-home',
  PAPER_VIEW: '/paper/:paperId',
  REPLICATION: '/replication/:paperId',
  DIGITAL_LAB: '/digital-lab',
  PROFILE: '/profile/:userId',
} as const;
