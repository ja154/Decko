/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface SearchResult {
  text: string;
  sourceLinks: { title: string; uri: string }[];
}

export interface SocialDraft {
  caption: string;
  hashtags: string[];
  imagePrompt: string;
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
export type ImageResolution = '1K' | '2K';

export interface ImageConfig {
  aspectRatio: AspectRatio;
  resolution: ImageResolution;
}

export type AppView = 'DISCOVER' | 'STUDIO';
export type StudioMode = 'GENERATE' | 'EDIT';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}
