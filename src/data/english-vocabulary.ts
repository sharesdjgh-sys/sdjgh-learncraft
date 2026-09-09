const CHAPTER_TERMS: Record<string, string[]> = {
  'Lesson 1. You and I Become "We"': ["become", "individual", "community"],
  "Lesson 2. Open a Book, Open the World": ["open-minded", "perspective", "worldview"],
  "Lesson 3. Free Yourself with Science": ["free oneself", "science", "curiosity"],
  "Lesson 4. Let It Be Green": ["green", "environment", "sustainability"],
  "Lesson 1. We Share, We Care": ["share", "care", "community"],
  "Lesson 2. Be a Wise Consumer": ["wise", "consumer", "consumption"],
  "Lesson 3. The True Art Lovers": ["art", "artist", "art lover"],
  "Lesson 4. Sink or Swim in the Digital Ocean": ["sink or swim", "digital", "digital literacy"],
  "Lesson 1. Smart Consumers": ["consumer", "consumer behavior", "shopping psychology"],
  "Lesson 2. Why Sports Technology Is the Game Changer": ["sports technology", "game changer", "performance"],
  "Lesson 3. Building for Change": ["architecture", "architect", "landmark"],
  "Lesson 4. The Joy of Giving": ["volunteer", "giving", "gratitude"],
  "Lesson 5. Unlock Your Original Thinking": ["original thinking", "creativity", "innovation"],
  "Lesson 1. Design that Benefits All": ["universal design", "accessibility", "inclusion"],
  "Lesson 2. The Future on Our Plates": ["lab-grown meat", "sustainable food", "food technology"],
  "Lesson 3. Mathematics Is More Than Just Numbers": ["mathematics", "counting unit", "compare and contrast"],
  "Lesson 4. Colorful Stories of Colors": ["color psychology", "symbolism", "marketing"],
  "Lesson 5. Winning with AI": ["artificial intelligence", "future-proof", "career"],
  "Lesson 6. Adventures in Literature": ["literature", "book review", "book trailer"],
};

const SECTION_TERMS: Record<string, string[]> = {
  "Listen & Speak": ["intonation", "word stress", "turn-taking"],
  "Read": ["main idea", "context clue", "inference"],
  "Language in Use": ["sentence structure", "subject", "verb"],
  "Language Focus": ["sentence structure", "subject", "verb"],
  "Write & Share": ["draft", "revise", "feedback"],
  "Write It Out": ["draft", "revise", "feedback"],
  "Project & Culture": ["culture", "perspective", "collaboration"],
  "Project": ["collaboration", "presentation", "audience"],
  "Read More / Inside Culture": ["culture", "perspective", "comparison"],
};

function normalized(value: string) {
  return value.normalize("NFC").trim().replace(/\s+/g, " ");
}

/**
 * Returns a small, conservative vocabulary set inferred from the visible lesson
 * and activity titles. These terms are not represented as words quoted from the
 * textbook body.
 */
export function englishVocabularyTerms(
  chapterTitle: string,
  sectionTitle: string,
  topicTitle: string,
): string[] {
  const chapter = normalized(chapterTitle);
  const section = normalized(sectionTitle);
  const topic = normalized(topicTitle);
  const chapterTerms = CHAPTER_TERMS[chapter] ?? [];
  const sectionTerms = SECTION_TERMS[section] ?? SECTION_TERMS[topic] ?? [];

  return [...new Set([...chapterTerms, ...sectionTerms])].slice(0, 6);
}
