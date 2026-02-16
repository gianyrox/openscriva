interface SuggestionData {
  anchor: { path: number[]; offset: number };
  focus: { path: number[]; offset: number };
  original: string;
  suggested: string;
}

export type { SuggestionData };
