/**
 * Demo response system for sandbox mode.
 *
 * Provides realistic mock AI responses so users can try Scriva's AI
 * features without an Anthropic API key.
 */

var demoCounter: Record<string, number> = {};

function nextIndex(key: string, count: number): number {
  var current = demoCounter[key] ?? 0;
  demoCounter[key] = (current + 1) % count;
  return current;
}

var DEMO_SUFFIX =
  "\n\n---\n*This is a demo response. Connect your Anthropic API key in Settings for real AI assistance.*";

var CHAT_RESPONSES = [
  "That's a great question about pacing. In general, the rhythm of your chapters should mirror the emotional arc you're building. Short, punchy sentences accelerate tension; longer, more flowing prose lets the reader breathe.\n\nFor your opening chapter, consider starting *in medias res* -- drop the reader into a moment of action or decision, then fill in context gradually. This creates immediate momentum.\n\nA few techniques that work well:\n- **Scene cuts** -- ending a scene at a moment of tension and jumping to a different thread\n- **Sentence length variation** -- mixing short declarative sentences with compound ones\n- **Concrete sensory detail** -- grounding abstract emotions in physical sensation\n\nWould you like me to look at a specific passage and suggest pacing adjustments?",
  "Character voice is one of the hardest things to get right, but it's also what makes a book memorable. Each character should sound distinct even without dialogue tags.\n\nHere are a few ways to differentiate voices:\n1. **Vocabulary level** -- a professor and a teenager wouldn't use the same words\n2. **Sentence patterns** -- some people speak in fragments, others in run-ons\n3. **Verbal tics** -- repeated phrases, hedging language, or directness\n4. **What they notice** -- a chef notices food, an architect notices buildings\n\nTry reading your dialogue aloud. If you can't tell who's speaking without the tags, the voices need more differentiation.",
  "World-building works best when it's woven into the narrative rather than presented in blocks of exposition. The reader should discover your world the way a traveler discovers a new city -- through sensory impressions, overheard conversations, and small telling details.\n\nThe iceberg principle applies here: know ten times more about your world than you put on the page. That depth will show in the confidence of your prose, even if the reader never sees the full picture.\n\nConsider using your point-of-view character as a filter. What would *they* notice? What would they take for granted? A local wouldn't describe their own city the way a tourist would.",
];

var WRITE_RESPONSES = [
  "I've read through this passage and I think we can tighten the tension while keeping your voice. Here are my suggestions:\n\n```edit\nThe morning light filtered through the curtains as she sat at the kitchen table, turning the letter over in her hands. Her coffee grew cold beside her. Outside, the neighbor's dog barked at something unseen, and the sound of a lawnmower started up two houses down. She read the first line again.\n```\n\nThe key changes: I removed the adverb from the opening, let the cold coffee do the emotional work (showing time passing and distraction), and added ambient detail that contrasts with the internal tension of the letter. The world goes on while her world might be about to change.",
  "This dialogue scene has good bones, but the beats between lines could work harder. Here's a tightened version:\n\n```edit\n\"You knew,\" she said.\n\nHe set down his glass with care, as if it might shatter. \"I suspected.\"\n\n\"That's not the same thing.\"\n\n\"No.\" He met her eyes. \"It isn't.\"\n\nThe silence between them filled with everything they weren't saying -- the years of careful omissions, the small kindnesses that were really small evasions.\n```\n\nNotice how the physical action (setting down the glass carefully) reveals character and emotion without telling. The final paragraph earns its abstraction because the concrete dialogue grounds it first.",
];

var RESEARCH_RESPONSES = [
  "## Victorian London: Social Structure and Daily Life\n\n### Class Divisions\n\nVictorian London operated on rigid class lines. The upper class (roughly 3% of the population) controlled most wealth. The growing middle class defined itself through respectability, education, and moral propriety. The working class and urban poor made up the vast majority.\n\n### Daily Rhythms\n\n- **Morning**: Working-class Londoners rose before dawn. Factory shifts began at 6 AM. Middle-class households followed strict breakfast routines.\n- **Midday**: The lunch hour was a middle-class invention. Workers ate where they could.\n- **Evening**: Gas lighting (from the 1810s) transformed nightlife. Music halls, gin palaces, and theaters drew crowds.\n\n### Key Details for Fiction\n\n- The Great Stink of 1858 forced Parliament to address sewage\n- Hansom cabs cost roughly 6 pence per mile\n- Servants' quarters were typically in the basement or attic\n- The penny post (1840) revolutionized communication\n\n### Recommended Sources\n\n- Judith Flanders, *The Victorian City* (2012)\n- Liza Picard, *Victorian London* (2005)\n- Henry Mayhew, *London Labour and the London Poor* (1851)",
];

var REVISION_RESPONSES = [
  "## Structural Critique\n\n### Pacing\nThe first half moves well, but the middle section loses momentum around the third scene. The transition from the argument to the flashback feels abrupt -- consider adding a brief present-moment beat to anchor the shift.\n\n### Character Development\nYour protagonist's motivation is clear, but the secondary character feels underserved. Their objection in the confrontation scene comes across as plot-convenient rather than character-driven. What do *they* want independently of the protagonist's arc?\n\n### Strengths\n- The opening image is strong and specific\n- Dialogue feels natural and distinct\n- The setting details are well-chosen and do double duty as mood\n\n### Suggested Revisions\n1. **Scene 3 transition** -- add 2-3 sentences grounding us in the present before the flashback\n2. **Secondary character** -- give them a private moment or internal contradiction\n3. **Final paragraph** -- the last line is trying to do too much; consider splitting the image from the reflection",
];

var CHAPTER_REVIEW_RESPONSES = [
  "## Strengths\n- Strong opening hook that establishes both setting and conflict\n- Effective use of sensory detail: \"the smell of old paper and lemon oil\"\n- Natural dialogue pacing in the confrontation scene\n\n## Weaknesses\n- The middle section (paragraphs 4-7) relies heavily on internal monologue without enough physical grounding\n- The secondary character's entrance feels rushed\n- Some telling where showing would be more effective: \"She felt angry\" could be rendered through action\n\n## Pacing\nThe chapter opens strong and closes well, but sags in the middle third. Consider cutting the extended reflection on pages 3-4 and distributing those thoughts across action beats.\n\n## Prose Quality\nSentence variety is good. Watch for the repeated \"she felt\" construction (appears 4 times). The descriptive passages are your strongest prose.\n\n## Suggestions\n1. **Paragraph 5** -- convert internal monologue to a brief, tense exchange with another character\n2. **The entrance scene** -- slow down by half a beat; let the reader see the door open before the character speaks\n3. **Final line** -- the current ending tells us what to feel; trust the image you've built",
];

var EDIT_CLEANUP_RESPONSES = [
  {
    result: "The morning arrived without ceremony. She found herself at the window again, watching the street below where puddles from last night's rain caught fragments of a reluctant sun. Nothing moved except a stray cat picking its way along the garden wall with the deliberation of someone choosing words carefully.\n\nShe turned from the window. The letter lay where she had left it, patient as a held breath.",
    reasoning: "Tightened the prose by removing redundant adjectives, converted two passive constructions to active voice, and strengthened the final image by making it a contained metaphor rather than an explicit statement of emotion.",
  },
];

var CONTINUE_RESPONSES = [
  "The door closed behind her with a click that seemed to echo longer than it should. She stood in the hallway, aware of the silence pressing in from all sides, the way silence does in old houses -- not empty but full of small, held sounds.\n\nShe had expected to feel relief. Instead there was something closer to vertigo, the disorientation of having said aloud what she had carried privately for so long. Words, once spoken, became real in a way that thoughts never did. They existed in the space between people, belonging to no one.\n\nIn the kitchen, the kettle she had put on before the conversation had long since boiled and gone quiet. She filled a cup out of habit, the familiar motions steadying her hands. Steam rose and curled, carrying with it the sharp green scent of the tea her mother used to drink.\n\nOutside, the afternoon light was thickening toward gold. She sat at the table and wrapped her hands around the cup, letting its warmth seep into her palms. Tomorrow she would have to decide what came next. But that was tomorrow's problem, and today had already asked enough of her.",
];

var DRAFT_RESPONSES = [
  "The house at the end of Carver Street had been empty for eleven months when the lights came back on.\n\nNeighbors noticed in the way neighbors do -- not all at once, but in whispered observations traded over fences and at the post office. The upstairs curtains moved first, then the front garden lost its wild edge, clipped back to something approaching respectability.\n\nElena Marsh arrived on a Tuesday, which struck Mrs. Fairfield next door as an odd day to start a new life. She drove a car that had seen better decades and carried boxes that she handled with more care than their battered cardboard suggested they deserved.\n\n\"Morning,\" Mrs. Fairfield called from her front step, the word calibrated to be friendly without being forward.\n\nThe woman looked up. She had the kind of face that was hard to age -- somewhere between thirty and the far side of forty, with dark eyes that held an expression Mrs. Fairfield would later describe to her husband as \"careful.\"\n\n\"Good morning.\" A pause that lasted a beat too long. \"I'm Elena.\"\n\n\"Jean Fairfield. Number twelve.\" She nodded at her own door as if proving it. \"Kettle's always on, if you need anything.\"\n\nElena smiled -- a real smile, Mrs. Fairfield noted, which made two of them already that morning, and in her experience new neighbors rarely managed even one.",
];

var VOICE_GUIDE_RESPONSES = [
  "## Voice and Style Analysis\n\n### Tone\nThe overall tone is **contemplative and observant**, with an undercurrent of quiet wit. The narrator maintains emotional distance without becoming cold -- there's warmth in the precision of the observations.\n\n### Sentence Structure\n- Favors medium-length sentences (15-25 words) with occasional short, declarative punctuation\n- Uses em dashes for parenthetical asides -- a signature pattern\n- Rarely uses semicolons; prefers to break related thoughts into separate sentences\n- Opening sentences tend to be concrete and grounding; closing sentences tend toward reflection\n\n### Vocabulary\nMid-register with selective precision. Avoids both literary showiness and colloquial casualness. Nouns and verbs carry the weight; adjectives are used sparingly and specifically.\n\n### Distinctive Patterns\n- Physical details used as emotional shorthand (cold coffee = anxiety; held breath = anticipation)\n- Dialogue is spare; characters speak in short exchanges rather than speeches\n- Similes are grounded in the everyday rather than the literary\n- Time markers often appear as sensory cues (quality of light, temperature) rather than clock references\n\n### Point of View\nClose third person with disciplined interiority. The narrator knows what the character thinks but chooses carefully when to share it. Unspoken thoughts are often implied through action.",
];

export type DemoMode =
  | "chat"
  | "write"
  | "research"
  | "research-prompt"
  | "revision"
  | "revision-plan"
  | "revision-critique"
  | "critique"
  | "chapter"
  | "continuity"
  | "readiness"
  | "cleanup"
  | "edit"
  | "continue"
  | "draft"
  | "voice-guide";

/**
 * Get a demo response for the chat/streaming endpoint.
 * Returns a string that should be streamed in chunks.
 */
export function getDemoChatResponse(mode: string): string {
  switch (mode) {
    case "chat": {
      var idx = nextIndex("chat", CHAT_RESPONSES.length);
      return CHAT_RESPONSES[idx] + DEMO_SUFFIX;
    }
    case "write": {
      var wIdx = nextIndex("write", WRITE_RESPONSES.length);
      return WRITE_RESPONSES[wIdx] + DEMO_SUFFIX;
    }
    case "research":
    case "research-prompt": {
      var rIdx = nextIndex("research", RESEARCH_RESPONSES.length);
      return RESEARCH_RESPONSES[rIdx] + DEMO_SUFFIX;
    }
    case "revision-plan":
    case "revision-critique":
    case "critique": {
      var revIdx = nextIndex("revision", REVISION_RESPONSES.length);
      return REVISION_RESPONSES[revIdx] + DEMO_SUFFIX;
    }
    default: {
      var cIdx = nextIndex("chat", CHAT_RESPONSES.length);
      return CHAT_RESPONSES[cIdx] + DEMO_SUFFIX;
    }
  }
}

/**
 * Get a demo response for the edit/cleanup endpoint.
 * Returns { result, reasoning }.
 */
export function getDemoEditResponse(): { result: string; reasoning: string } {
  var idx = nextIndex("edit", EDIT_CLEANUP_RESPONSES.length);
  var resp = EDIT_CLEANUP_RESPONSES[idx];
  return {
    result: resp.result + DEMO_SUFFIX,
    reasoning: resp.reasoning,
  };
}

/**
 * Get a demo response for the generate endpoint.
 * Returns { result }.
 */
export function getDemoGenerateResponse(mode: string): { result: string } {
  switch (mode) {
    case "continue": {
      var cIdx = nextIndex("continue", CONTINUE_RESPONSES.length);
      return { result: CONTINUE_RESPONSES[cIdx] + DEMO_SUFFIX };
    }
    case "draft": {
      var dIdx = nextIndex("draft", DRAFT_RESPONSES.length);
      return { result: DRAFT_RESPONSES[dIdx] + DEMO_SUFFIX };
    }
    case "voice-guide": {
      var vIdx = nextIndex("voice-guide", VOICE_GUIDE_RESPONSES.length);
      return { result: VOICE_GUIDE_RESPONSES[vIdx] + DEMO_SUFFIX };
    }
    case "research": {
      var rIdx = nextIndex("research", RESEARCH_RESPONSES.length);
      return { result: RESEARCH_RESPONSES[rIdx] + DEMO_SUFFIX };
    }
    default: {
      var defIdx = nextIndex("continue", CONTINUE_RESPONSES.length);
      return { result: CONTINUE_RESPONSES[defIdx] + DEMO_SUFFIX };
    }
  }
}

/**
 * Get a demo response for the review endpoint.
 * Returns { result }.
 */
export function getDemoReviewResponse(mode: string): { result: string } {
  switch (mode) {
    case "chapter": {
      var chIdx = nextIndex("chapter-review", CHAPTER_REVIEW_RESPONSES.length);
      return { result: CHAPTER_REVIEW_RESPONSES[chIdx] + DEMO_SUFFIX };
    }
    case "continuity":
    case "readiness":
    default: {
      var revIdx = nextIndex("revision", REVISION_RESPONSES.length);
      return { result: REVISION_RESPONSES[revIdx] + DEMO_SUFFIX };
    }
  }
}

/**
 * Check if a request body indicates demo mode.
 * Demo mode is active when demo===true and no API key is provided.
 */
export function isDemoRequest(body: Record<string, unknown>): boolean {
  return body.demo === true;
}
