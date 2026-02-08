
export interface Slide {
  id: string;
  pageNumber: number;
  imageUrl: string;
  explanation: string | null;
  textContent?: string;
  status: 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR';
  customPrompt?: string;
  analyzedBy?: {
    userId: string;
    userName: string;
    timestamp: number;
  };
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

export interface Folder {
  id: string;
  name: string;
  userId: string;
  createdAt: number;
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
  folderId?: string | null;
  summary?: string;
}

export interface ContextItem {
  slideId: string;
  pageNumber: number;
  imageUrl?: string;
  explanation?: string | null;
  includeImage: boolean;
  includeExplanation: boolean;
}
