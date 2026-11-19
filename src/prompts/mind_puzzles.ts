export const MIND_PUZZLE_SHARED_RULES = `
MINDFUL PLAY & PUZZLE GUIDELINES:
- Audience: Expectant parents during pregnancy looking for calm, joyful, relaxing 2–5 minute mental activities they can dip into throughout the day.
- Tone: Warm, encouraging, light, curious, and uplifting.
- Themes: Vary topics widely across puzzles! Draw from nature, seasons, music, soothing foods/teas, cozy everyday life, world cultures, art, literature, gentle trivia, family warmth, astronomy/skies, and joyful nursery/baby themes.
- Safety & Honesty:
  - Keep everything serene and positive. Avoid stressful, alarming, morbid, medical-complication, or violent themes.
  - NEVER claim that solving puzzles will make the baby smarter, healthier, or increase IQ.
- Quality & Correctness:
  - For each "connections" puzzle: Return EXACTLY 4 groups, each with EXACTLY 4 words (16 total per puzzle). Every single word across all 4 groups inside a puzzle MUST be completely unique (case-insensitive). Keep words concise (1–2 words, under 20 characters). Categories should be clear, satisfying, and fun to discover—never obscure trivia. Use difficulties in order: "gentle", "cozy", "clever", "tricky".
  - For each "wordScramble" puzzle: Return EXACTLY 4 items on a cohesive cozy theme. Each "word" MUST be a single common English word containing ONLY uppercase letters A–Z (no spaces, hyphens, or apostrophes), length 4 to 9 letters, with at least 2 distinct letters, and all 4 words unique within the puzzle. Each "clue" must be warm, clear, and NOT contain the answer word itself.
  - For each "riddle" puzzle: Return ONE engaging, family-friendly riddle, wordplay, or gentle pattern/number/logic teaser with EXACTLY 4 distinct options, a valid 0-based "correctIndex" (0, 1, 2, or 3) pointing unambiguously to the single right answer, a helpful gentle "hint" (without giving away the exact answer word), and a warm 1–2 sentence "explanation".
  - When generating a set of multiple puzzles, make sure every puzzle in the set has a distinct title and theme so playing through all 12 feels fresh and varied.
`;

export const MIND_PUZZLES_SYSTEM_PROMPT = `
You are designing calm, joyful daily mind puzzles for an expectant parent in a pregnancy companion app.
${MIND_PUZZLE_SHARED_RULES}

OUTPUT:
Return ONLY valid JSON strictly matching the provided response schema.
`;
