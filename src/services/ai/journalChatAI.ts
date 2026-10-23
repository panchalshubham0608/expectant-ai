import { DEFAULT_GEMINI_MODEL, getGeminiClient } from './geminiCore';
import {
  buildJournalChatContext,
  type JournalChatContextInput,
} from './journalChatContextBuilder';
import type {
  ChatSuggestedAppointment,
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

const extractDateFromText = (text?: string): string | undefined => {
  if (!text) return undefined;
  const match = text.match(
    /\bon\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})(?:,?\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM)))?/i
  );
  if (!match) return undefined;
  const datePart = match[1];
  const timePart = match[2] || '10:00 AM';
  const parsed = new Date(`${datePart} ${timePart}`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const extractDoctorFromText = (text?: string): string | undefined => {
  if (!text) return undefined;
  const match = text.match(
    /\bwith\s+(Dr\.?\s+[A-Za-z][A-Za-z\s.]+?)(?:\s+on\b|\s+at\b|\s+for\b|[.,?]|$)/i
  );
  return match?.[1]?.trim();
};

const normalizeDoctorKey = (name?: string): string =>
  (name ?? '')
    .toLowerCase()
    .replace(/^dr\.?\s*/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const doctorsMatch = (a?: string, b?: string): boolean => {
  const keyA = normalizeDoctorKey(a);
  const keyB = normalizeDoctorKey(b);
  if (!keyA || !keyB) return false;
  return keyA === keyB || keyA.includes(keyB) || keyB.includes(keyA);
};

export const normalizeSuggestedAppointment = (
  raw: Partial<ChatSuggestedAppointment> | undefined,
  contextInput: Partial<JournalChatContextInput>,
  answerText?: string
): ChatSuggestedAppointment | undefined => {
  if (raw?.savedAppointmentId && raw.reason) {
    return raw as ChatSuggestedAppointment;
  }

  const mentionsFormInAnswer = Boolean(
    answerText &&
      /pre-filled appointment form|appointment form right below|review, edit, or confirm the pre-filled appointment/i.test(
        answerText
      )
  );

  const hasRawData = Boolean(
    raw &&
      (raw.reason?.trim() ||
        raw.scheduledAt?.trim() ||
        raw.doctorName?.trim() ||
        raw.hospital?.trim() ||
        raw.savedAppointmentId ||
        (Array.isArray(raw.questions) && raw.questions.length > 0))
  );

  if (!hasRawData && !mentionsFormInAnswer) {
    return undefined;
  }

  const sortedAppointments = [...(contextInput.appointments ?? [])]
    .filter((a) => a.status !== 'cancelled')
    .sort(
      (a, b) =>
        new Date(b.completedAt || b.scheduledAt).getTime() -
        new Date(a.completedAt || a.scheduledAt).getTime()
    );

  const isFollowUpVisit = Boolean(
    (raw?.reason && /follow[- ]?up/i.test(raw.reason)) ||
      (answerText && /follow[- ]?up/i.test(answerText))
  );

  const extractedDate = extractDateFromText(answerText);
  const targetDatePrefix = (extractedDate || raw?.scheduledAt || '').slice(0, 10);

  const appointmentWithMatchingFollowUp = targetDatePrefix
    ? sortedAppointments.find(
        (a) => a.followUpDate && a.followUpDate.slice(0, 10) === targetDatePrefix
      )
    : undefined;

  const appointmentWithFollowUp =
    appointmentWithMatchingFollowUp ??
    sortedAppointments.find((a) => Boolean(a.followUpDate));

  const candidateDoctor =
    extractDoctorFromText(answerText) ||
    raw?.doctorName?.trim() ||
    appointmentWithFollowUp?.doctorName?.trim() ||
    contextInput.profile?.careProvider?.trim() ||
    sortedAppointments[0]?.doctorName?.trim() ||
    '';

  const sameDoctorFollowUpAppts = candidateDoctor
    ? sortedAppointments.filter(
        (a) =>
          doctorsMatch(a.doctorName, candidateDoctor) &&
          (/follow[- ]?up/i.test(a.reason) || Boolean(a.followUpDate))
      )
    : [];

  const sameDoctorAppts = candidateDoctor
    ? sortedAppointments.filter((a) => doctorsMatch(a.doctorName, candidateDoctor))
    : [];

  const anyFollowUpAppts = sortedAppointments.filter(
    (a) => /follow[- ]?up/i.test(a.reason) || Boolean(a.followUpDate)
  );

  const prioritizedAppts = Array.from(
    new Set([
      ...(appointmentWithFollowUp ? [appointmentWithFollowUp] : []),
      ...sameDoctorFollowUpAppts,
      ...sameDoctorAppts,
      ...(isFollowUpVisit ? anyFollowUpAppts : []),
      ...sortedAppointments,
    ])
  );

  const canonicalDoctorFromHistory = [
    ...(appointmentWithFollowUp &&
    (!candidateDoctor || doctorsMatch(appointmentWithFollowUp.doctorName, candidateDoctor))
      ? [appointmentWithFollowUp]
      : []),
    ...sameDoctorFollowUpAppts,
    ...sameDoctorAppts,
  ]
    .map((a) => a.doctorName?.trim())
    .find(Boolean);

  const inferredDoctor =
    canonicalDoctorFromHistory ||
    candidateDoctor ||
    prioritizedAppts.map((a) => a.doctorName?.trim()).find(Boolean) ||
    '';

  const inferredSpecialty =
    prioritizedAppts.map((a) => a.specialty?.trim()).find(Boolean) ||
    raw?.specialty?.trim() ||
    'OB-GYN';

  const inferredHospital =
    prioritizedAppts.map((a) => a.hospital?.trim()).find(Boolean) ||
    raw?.hospital?.trim() ||
    contextInput.profile?.primaryHospital?.trim() ||
    '';

  const inferredScheduledAt =
    extractedDate ||
    (isFollowUpVisit && appointmentWithFollowUp?.followUpDate
      ? appointmentWithFollowUp.followUpDate.trim()
      : undefined) ||
    raw?.scheduledAt?.trim() ||
    appointmentWithFollowUp?.followUpDate?.trim() ||
    undefined;

  const rawQuestions = Array.isArray(raw?.questions)
    ? raw.questions.map((q) => String(q).trim()).filter(Boolean)
    : [];

  const fallbackQuestions =
    rawQuestions.length > 0
      ? rawQuestions
      : (contextInput.reports ?? [])
          .flatMap((r) => r.questionsForDoctor ?? [])
          .map((q) => q.trim())
          .filter(Boolean)
          .slice(0, 3);

  const pastFollowUpReason = isFollowUpVisit
    ? sameDoctorFollowUpAppts
        .map((a) => a.reason?.trim())
        .find((r) => r && /follow[- ]?up/i.test(r))
    : undefined;

  const fallbackReason = isFollowUpVisit
    ? pastFollowUpReason || 'Follow-Up Visit'
    : 'Prenatal Checkup';

  return {
    reason: raw?.reason?.trim() || fallbackReason,
    scheduledAt: inferredScheduledAt,
    doctorName: inferredDoctor,
    specialty: inferredSpecialty,
    hospital: inferredHospital,
    questions: fallbackQuestions,
    savedAppointmentId: raw?.savedAppointmentId,
    dismissed: raw?.dismissed,
  };
};

const JOURNAL_CHAT_SYSTEM_INSTRUCTION = `You are MIRA (Maternal Intelligence & Record Assistant), a warm, empathetic, and deeply knowledgeable pregnancy companion and daily journal assistant for an expectant parent.

You have full access to the expectant's context in the JSON payload:
- "profile": Name, age, blood group, location, current pregnancy week/day, trimester, expected due date, LMP, care provider, and primaryHospital.
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

5. Chat-Integrated Appointment Scheduling ("suggestedAppointment"):
   - Populate "suggestedAppointment" ONLY when:
     a) The expectant asks to schedule, book, create, or set up an appointment, checkup, or scan, OR
     b) The expectant asks about a follow-up visit, upcoming milestone scan, or recent report/symptom that directly warrants scheduling a doctor visit.
   - Leave "suggestedAppointment" omitted/null for general conversation where scheduling a visit is not relevant.
   - When populating "suggestedAppointment", carefully analyze past and upcoming "appointments" first to infer accurate metadata:
     - "doctorName": Match the doctor from the user's message, the appointment with a "followUpDate", or past follow-up appointments (or "profile.careProvider").
     - "specialty": Infer from past appointments with that same doctor or past follow-up appointments (e.g., "OB-GYN").
     - "hospital": Infer from past appointments with that same doctor or past follow-up appointments (e.g., the specific clinic such as "Dr. Garima Jain Clinic" recorded on past visits with that doctor, falling back to "profile.primaryHospital" only if no appointment has a hospital).
     - "reason": Clear visit purpose matching past appointment conventions or the user's request (e.g., "Follow-Up Visit", "20-Week Anomaly Scan", "Routine Prenatal Checkup").
     - "scheduledAt": ISO 8601 local datetime string ("YYYY-MM-DDTHH:mm") resolved relative to "currentDate" if the user mentioned a day/time, or from a recent appointment's "followUpDate", or a sensible upcoming default.
     - "questions": 2 to 4 relevant questions for the doctor seeded from the user's message, recent medical reports ("questionsForDoctor" or key findings), past appointment recommendations/observations, and recent symptoms/logs.
   - When you include "suggestedAppointment", mention in "answer" that you've prepared a pre-filled appointment form right below so they can review or adjust the details and save it.

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
          suggestedAppointment: {
            type: 'OBJECT',
            properties: {
              reason: { type: 'STRING' },
              scheduledAt: { type: 'STRING' },
              doctorName: { type: 'STRING' },
              specialty: { type: 'STRING' },
              hospital: { type: 'STRING' },
              questions: {
                type: 'ARRAY',
                items: { type: 'STRING' },
              },
            },
            required: ['reason'],
          },
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
    suggestedAppointment?: Partial<ChatSuggestedAppointment>;
  }>;

  const extracted = normalizeExtraction(parsed.extracted ?? EMPTY_EXTRACTION);
  const merged = contextInput.knownState
    ? mergeJournalExtraction(contextInput.knownState, extracted)
    : extracted;

  const suggestedAppointment = normalizeSuggestedAppointment(
    parsed.suggestedAppointment,
    contextInput,
    parsed.answer
  );

  return {
    extracted: merged,
    reply: {
      answer:
        parsed.answer ||
        'I have noted that. Tell me a little more about how you are feeling today.',
      followUpQuestion: parsed.followUpQuestion,
      summary: parsed.summary,
      suggestedAppointment,
    },
  };
};