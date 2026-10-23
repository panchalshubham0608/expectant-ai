import { DEFAULT_GEMINI_MODEL, getGeminiClient } from './geminiCore';
import {
  buildJournalChatContext,
  type JournalChatContextInput,
} from './journalChatContextBuilder';
import type {
  JournalMessageExtraction,
  JournalChatTurnResult,
} from './journalChatService';

const normalizeExtraction = (
  value?: Partial<JournalMessageExtraction>
): JournalMessageExtraction => ({
  meals: value?.meals ?? [],
  hydration: value?.hydration ?? [],
  symptoms: value?.symptoms ?? [],
  mood: value?.mood,
  sleep: value?.sleep,
  activities: value?.activities ?? [],
  medications: value?.medications ?? [],
  notes: value?.notes ?? [],
  other: value?.other ?? [],
});

export const mergeJournalExtraction = (
  current: JournalMessageExtraction,
  next: JournalMessageExtraction
): JournalMessageExtraction => ({
  meals: [...(current.meals ?? []), ...(next.meals ?? [])],
  hydration: [...(current.hydration ?? []), ...(next.hydration ?? [])],
  symptoms: [...(current.symptoms ?? []), ...(next.symptoms ?? [])],
  activities: [...(current.activities ?? []), ...(next.activities ?? [])],
  medications: [...(current.medications ?? []), ...(next.medications ?? [])],
  mood: next.mood ?? current.mood,
  sleep: next.sleep ?? current.sleep,
  notes: [...(current.notes ?? []), ...(next.notes ?? [])],
  other: [...(current.other ?? []), ...(next.other ?? [])],
});

const EMPTY_EXTRACTION: JournalMessageExtraction = {
  meals: [],
  hydration: [],
  symptoms: [],
  activities: [],
  medications: [],
  notes: [],
  other: [],
};

const JOURNAL_CHAT_SYSTEM_INSTRUCTION = `You are a warm, empathetic, and deeply knowledgeable pregnancy companion and daily journal assistant for an expectant parent.

You have full access to the expectant's context in the JSON payload:
- "profile": Name, age, blood group, location, current pregnancy week/day, trimester, expected due date, LMP, care provider, and hospital.
- "medicalReports": Uploaded ultrasound, blood test, urine test, prescription, and consultation reports (including plain-English summaries, important findings, diagnoses, measurements, prescribed medicines, historical comparisons, and questions for the doctor).
- "appointments": Upcoming scheduled visits and past completed visits (doctor name, specialty, hospital, reason, observations, diagnoses, recommendations, prescribed medications, and follow-up dates).
- "healthMeasurements": Tracked vitals and measurements (weight, blood pressure, hemoglobin, glucose, fetal heart rate, etc.) with previous values and normal ranges.
- "medications": Currently active medications (with dose, frequency, duration, instructions) and discontinued medications.
- "activeReminders": Daily/weekly reminders configured by the expectant.
- "recentDailyLogs" & "knownState": Recent daily journal logs (meals, hydration, symptoms, mood, sleep, activities, medications taken, notes).
- "recentConversation": The ongoing chat history.
- "currentMessage": The expectant's latest message or question.

YOUR RESPONSIBILITIES:
1. Personalized, Context-Aware Answers ("answer"):
   - Answer any question the expectant asks using their specific profile, reports, appointments, measurements, medications, and recent logs.
   - When asked about reports, measurements, medications, or appointments, cite the relevant dates, values, doctor names, and findings clearly and accurately in plain, reassuring language.
   - Use clean formatting in "answer": short paragraphs, bullet points ("- ") for lists, and **bold** for key terms, dates, or values when helpful.
   - Keep your tone warm, supportive, and conversational.
   - Maintain continuity with "recentConversation".

2. Medical Safety & Boundaries:
   - Never diagnose medical conditions or prescribe/alter medications.
   - When discussing lab values, symptoms, or medications, provide educational context and encourage discussing specifics with their care provider (use their doctor's name from "profile.careProvider" or recent appointments when available).
   - If the expectant describes urgent red-flag symptoms (e.g., severe abdominal pain, heavy vaginal bleeding, severe headache with vision changes, high fever, or noticeably reduced fetal movement), gently advise contacting their care provider or hospital right away.

3. Structured Daily Journal Extraction ("extracted"):
   - Extract ONLY newly mentioned journal facts from "currentMessage" (do NOT repeat items already present in "knownState" or "recentConversation").
   - If "currentMessage" is purely a question (e.g., asking about a report or appointment) and does not log any new meals, hydration, symptoms, mood, sleep, activities, or medications taken, return empty arrays in "extracted".

4. Optional Follow-Up ("followUpQuestion"):
   - Optionally include a single, natural, caring follow-up question in "followUpQuestion" if it helps continue the conversation or check in on them.

Return valid JSON matching the schema exactly.`;

export const generateJournalChatReply = async (
  contextInput: JournalChatContextInput,
  userApiKey?: string
): Promise<JournalChatTurnResult> => {
  const ai = getGeminiClient(userApiKey);
  const env =
    typeof process !== 'undefined' && process.env
      ? process.env
      : (import.meta as any).env;
  const model = env?.VITE_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  const context = buildJournalChatContext(contextInput);

  const response = await ai.models.generateContent({
    model,
    contents: JSON.stringify(context, null, 2),
    config: {
      systemInstruction: JOURNAL_CHAT_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          extracted: {
            type: 'OBJECT',
            properties: {
              meals: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    id: { type: 'STRING' },
                    mealType: {
                      type: 'STRING',
                      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
                    },
                    consumedAt: { type: 'STRING' },
                    foods: {
                      type: 'ARRAY',
                      items: {
                        type: 'OBJECT',
                        properties: {
                          name: { type: 'STRING' },
                          quantity: { type: 'STRING' },
                          confidence: { type: 'NUMBER' },
                        },
                        required: ['name', 'confidence'],
                      },
                    },
                    notes: { type: 'STRING' },
                  },
                  required: ['mealType', 'foods'],
                },
              },
              hydration: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    id: { type: 'STRING' },
                    amountMl: { type: 'NUMBER' },
                    type: {
                      type: 'STRING',
                      enum: ['water', 'milk', 'juice', 'coconut-water', 'other'],
                    },
                    timestamp: { type: 'STRING' },
                  },
                  required: ['amountMl', 'type'],
                },
              },
              symptoms: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    id: { type: 'STRING' },
                    type: { type: 'STRING' },
                    severity: {
                      type: 'STRING',
                      enum: ['mild', 'moderate', 'severe'],
                    },
                    startedAt: { type: 'STRING' },
                    notes: { type: 'STRING' },
                  },
                  required: ['type', 'severity'],
                },
              },
              mood: {
                type: 'OBJECT',
                properties: {
                  mood: {
                    type: 'STRING',
                    enum: [
                      'happy',
                      'calm',
                      'tired',
                      'anxious',
                      'stressed',
                      'sad',
                      'other',
                    ],
                  },
                  notes: { type: 'STRING' },
                  time: { type: 'STRING' },
                },
              },
              sleep: {
                type: 'OBJECT',
                properties: {
                  bedtime: { type: 'STRING' },
                  wakeTime: { type: 'STRING' },
                  quality: { type: 'NUMBER' },
                  naps: {
                    type: 'ARRAY',
                    items: {
                      type: 'OBJECT',
                      properties: {
                        start: { type: 'STRING' },
                        end: { type: 'STRING' },
                      },
                    },
                  },
                },
              },
              activities: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    id: { type: 'STRING' },
                    type: { type: 'STRING' },
                    durationMinutes: { type: 'NUMBER' },
                    intensity: {
                      type: 'STRING',
                      enum: ['low', 'moderate', 'high'],
                    },
                    timestamp: { type: 'STRING' },
                    notes: { type: 'STRING' },
                  },
                },
              },
              medications: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    medicineName: { type: 'STRING' },
                    scheduledTime: { type: 'STRING' },
                    takenTime: { type: 'STRING' },
                    dose: { type: 'STRING' },
                    taken: { type: 'BOOLEAN' },
                  },
                  required: ['medicineName', 'taken'],
                },
              },
              notes: {
                type: 'ARRAY',
                items: { type: 'STRING' },
              },
              other: {
                type: 'ARRAY',
                items: { type: 'STRING' },
              },
            },
            required: [
              'meals',
              'hydration',
              'symptoms',
              'activities',
              'medications',
              'notes',
              'other',
            ],
          },
          answer: { type: 'STRING' },
          followUpQuestion: { type: 'STRING' },
          summary: { type: 'STRING' },
        },
        required: ['extracted', 'answer'],
      },
    },
  });

  if (!response.text) {
    throw new Error('Gemini returned an empty response for the journal chat.');
  }

  const parsed = JSON.parse(response.text) as Partial<{
    extracted?: Partial<JournalMessageExtraction>;
    answer?: string;
    followUpQuestion?: string;
    summary?: string;
  }>;

  const extracted = normalizeExtraction(parsed.extracted ?? EMPTY_EXTRACTION);
  const merged = contextInput.knownState
    ? mergeJournalExtraction(contextInput.knownState, extracted)
    : extracted;

  return {
    extracted: merged,
    reply: {
      answer:
        parsed.answer ||
        'I have noted that. Tell me a little more about how you are feeling today.',
      followUpQuestion: parsed.followUpQuestion,
      summary: parsed.summary,
    },
  };
};