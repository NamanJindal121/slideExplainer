
export interface Slide {
  id: string;
  pageNumber: number;
  imageUrl: string;
  explanation: string | null;
  status: 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR';
  customPrompt?: string;
}

export type AppState = 'LANDING' | 'DASHBOARD' | 'UPLOAD' | 'VIEWER';

export interface ExplanationRequest {
  imageBase64: string;
  prompt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Presentation {
  id: string;
  title: string;
  thumbnailUrl: string; // URL of the first slide
  lastModified: number;
  slideCount: number;
  slides: Slide[];
  authorId: string;
  authorName: string;
  authorPhoto?: string;
}
