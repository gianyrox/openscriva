export type WritingType = "fiction" | "nonfiction" | "academic" | "custom";
export type ModelId = "haiku" | "sonnet" | "opus";
export type EmbeddingModel = "voyage-3-lite";

export interface ScrivaConfig {
  version: string;
  writingType: WritingType;
  features: ScrivaFeatures;
  ai: ScrivaAIConfig;
}

export interface ScrivaFeatures {
  characters: boolean;
  worldBuilding: boolean;
  plotThreads: boolean;
  narrativeState: boolean;
  citations: boolean;
  voiceProfile: boolean;
  chapterSummaries: boolean;
  sceneSummaries: boolean;
  revisionTracking: boolean;
  tensionTracking: boolean;
  rag: boolean;
}

export interface ScrivaAIConfig {
  defaultModel: ModelId;
  memoryModel: "haiku";
  embeddingModel: EmbeddingModel;
  contextBudget: number;
  ragTopK: number;
  autoReindex: boolean;
  autoReindexDebounceMs: number;
}

export type TaskType =
  | "chat"
  | "write"
  | "continue"
  | "edit"
  | "critique"
  | "research"
  | "revision-plan";

export interface MatterSection {
  type: "dedication" | "preface" | "foreword" | "introduction" | "prologue" | "epilogue" | "acknowledgments" | "appendix" | "glossary" | "bibliography" | "index" | "afterword" | "custom";
  title: string;
  file?: string;
}

export interface CharacterNode {
  id: string;
  name: string;
  aliases: string[];
  role: "protagonist" | "antagonist" | "supporting" | "minor" | "mentioned";
  firstAppearance: string;
  lastAppearance: string;
  alive: boolean;
  description: string;
  arc: string;
  currentState: string;
  traits: string[];
  relationships: Relationship[];
  appearances: string[];
  _override?: boolean;
}

export interface Relationship {
  target: string;
  type: string;
  evolution: string;
  currentState: string;
}

export interface PlaceNode {
  id: string;
  name: string;
  description: string;
  significance: string;
  chapters: string[];
  _override?: boolean;
}

export interface TimelineEvent {
  id: string;
  event: string;
  chapter: string;
  characters: string[];
  significance: string;
  storyTime: string;
  _override?: boolean;
}

export interface ObjectNode {
  id: string;
  name: string;
  description: string;
  significance: string;
  chapters: string[];
  _override?: boolean;
}

export interface WorldRule {
  id: string;
  rule: string;
  domain: string;
  _override?: boolean;
}

export interface WorldModel {
  characters: CharacterNode[];
  places: PlaceNode[];
  timeline: TimelineEvent[];
  objects: ObjectNode[];
  rules: WorldRule[];
}

export interface NarrativeState {
  currentPoint: string;
  readerKnows: string[];
  readerExpects: string[];
  dramaticIrony: string[];
  _override?: boolean;
}

export interface NarrativePromise {
  id: string;
  setup: string;
  setupChapter: string;
  payoffChapter?: string;
  status: "planted" | "growing" | "due" | "paid" | "abandoned";
  urgency: "low" | "medium" | "high";
  _override?: boolean;
}

export interface PlotThread {
  id: string;
  name: string;
  status: "open" | "progressing" | "resolved" | "dropped";
  chapters: string[];
  summary: string;
  _override?: boolean;
}

export interface TensionData {
  chapterId: string;
  tensionLevel: number;
  pacingNote: string;
  emotionalBeat: string;
}

export interface VoiceMetrics {
  avgSentenceLength: number;
  vocabularyRichness: string;
  povStyle: string;
  dialogueToNarrationRatio: string;
  metaphorUsage: string;
  paragraphRhythm: string;
  tenseUsage: string;
}

export interface VoiceProfile {
  summary: string;
  metrics: VoiceMetrics;
  genreCalibration: string;
  lastUpdated: number;
  analyzedChapters: string[];
  _override?: boolean;
}

export interface VoiceExemplar {
  id: string;
  text: string;
  chapter: string;
  tags: string[];
  quality: "signature" | "strong" | "reference";
}

export interface AntiPattern {
  id: string;
  original: string;
  correction?: string;
  reason: string;
  tags: string[];
  source: "author-rewrite" | "rejected-edit" | "manual";
}

export interface VoiceDrift {
  chapterId: string;
  consistencyScore: number;
  driftNotes: string[];
  comparedTo: string;
}

export interface WritingRules {
  tone: string[];
  avoid: string[];
  prefer: string[];
  povConsistency: string;
  tenseConsistency: string;
  dialogueStyle: string;
  revisionFocus: string[];
  customInstructions: string;
  perChapterOverrides?: Record<string, Partial<WritingRules>>;
}

export interface RevisionEntry {
  id: string;
  chapterId: string;
  timestamp: number;
  type: "ai-edit" | "author-rewrite" | "structural";
  description: string;
  tokensChanged: number;
}

export interface LearnedPreference {
  pattern: string;
  authorResponse: "accepted" | "rejected";
  count: number;
  lastSeen: number;
  inferredRule?: string;
}

export interface CitationEntry {
  id: string;
  type: "book" | "article" | "web" | "journal" | "chapter" | "other";
  title: string;
  authors: string[];
  year?: number;
  publisher?: string;
  url?: string;
  doi?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  accessDate?: string;
  notes?: string;
}

export interface TextChunk {
  id: string;
  text: string;
  tokens: number;
  source: string;
  chapterId: string;
  type: "narrative" | "dialogue" | "description" | "interiority" | "action";
  characters: string[];
  position: number;
}

export interface RAGQuery {
  text: string;
  filters?: {
    chapterIds?: string[];
    types?: string[];
    characters?: string[];
  };
  topK: number;
}

export interface RAGResult {
  chunk: TextChunk;
  score: number;
  context: string;
}

export interface EmbeddingManifest {
  version: string;
  model: EmbeddingModel;
  dimensions: number;
  chunkCount: number;
  lastIndexed: number;
  chapterHashes: Record<string, string>;
}

export interface BriefingSection {
  label: string;
  content: string;
  tokens: number;
  priority: "critical" | "high" | "medium" | "low";
  source: string;
}

export interface ContextBriefing {
  budget: number;
  sections: BriefingSection[];
  totalTokens: number;
}

export interface CompileTask {
  type: TaskType;
  chapterId?: string;
  partId?: string;
  characters?: string[];
  selection?: string;
  userMessage?: string;
}

export interface SceneBeat {
  id: string;
  summary: string;
  characters: string[];
  emotionalTone: string;
  position: number;
}

export type FeatureKey = keyof ScrivaFeatures;

export function defaultFeaturesForType(writingType: WritingType): ScrivaFeatures {
  if (writingType === "fiction") {
    return {
      characters: true,
      worldBuilding: true,
      plotThreads: true,
      narrativeState: true,
      citations: false,
      voiceProfile: true,
      chapterSummaries: true,
      sceneSummaries: false,
      revisionTracking: true,
      tensionTracking: true,
      rag: true,
    };
  }

  if (writingType === "nonfiction") {
    return {
      characters: false,
      worldBuilding: false,
      plotThreads: false,
      narrativeState: false,
      citations: true,
      voiceProfile: true,
      chapterSummaries: true,
      sceneSummaries: false,
      revisionTracking: true,
      tensionTracking: false,
      rag: true,
    };
  }

  if (writingType === "academic") {
    return {
      characters: false,
      worldBuilding: false,
      plotThreads: false,
      narrativeState: false,
      citations: true,
      voiceProfile: true,
      chapterSummaries: true,
      sceneSummaries: false,
      revisionTracking: true,
      tensionTracking: false,
      rag: true,
    };
  }

  return {
    characters: false,
    worldBuilding: false,
    plotThreads: false,
    narrativeState: false,
    citations: false,
    voiceProfile: true,
    chapterSummaries: true,
    sceneSummaries: false,
    revisionTracking: false,
    tensionTracking: false,
    rag: false,
  };
}

export function defaultScrivaConfig(writingType: WritingType): ScrivaConfig {
  return {
    version: "1.0.0",
    writingType,
    features: defaultFeaturesForType(writingType),
    ai: {
      defaultModel: "sonnet",
      memoryModel: "haiku",
      embeddingModel: "voyage-3-lite",
      contextBudget: 4000,
      ragTopK: 5,
      autoReindex: true,
      autoReindexDebounceMs: 15000,
    },
  };
}

export function defaultWritingRules(): WritingRules {
  return {
    tone: [],
    avoid: [],
    prefer: [],
    povConsistency: "",
    tenseConsistency: "",
    dialogueStyle: "",
    revisionFocus: [],
    customInstructions: "",
  };
}

export function defaultWorldModel(): WorldModel {
  return {
    characters: [],
    places: [],
    timeline: [],
    objects: [],
    rules: [],
  };
}

export function defaultNarrativeState(): NarrativeState {
  return {
    currentPoint: "",
    readerKnows: [],
    readerExpects: [],
    dramaticIrony: [],
  };
}

export function defaultVoiceProfile(): VoiceProfile {
  return {
    summary: "",
    metrics: {
      avgSentenceLength: 0,
      vocabularyRichness: "",
      povStyle: "",
      dialogueToNarrationRatio: "",
      metaphorUsage: "",
      paragraphRhythm: "",
      tenseUsage: "",
    },
    genreCalibration: "",
    lastUpdated: 0,
    analyzedChapters: [],
  };
}

export function defaultEmbeddingManifest(): EmbeddingManifest {
  return {
    version: "1.0.0",
    model: "voyage-3-lite",
    dimensions: 1024,
    chunkCount: 0,
    lastIndexed: 0,
    chapterHashes: {},
  };
}
