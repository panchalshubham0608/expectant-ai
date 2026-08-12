import { SUMMARIZE_REPORT_PROMPT } from "../../prompts/summarize_report";
import { getGeminiClient, DEFAULT_GEMINI_MODEL } from './geminiCore';

import type { ReportType } from '../../models/report';

export interface GeminiPregnancyReportResponse {
  reportType: ReportType;
  metadata: {
    title: string | null;
    hospital: string | null;
    doctor: string | null;
    reportDate: string | null;
    pregnancyWeek: string | null;
  };
  summary: {
    plainEnglish: string;
    importantFindings: string[];
    followUpActions: string[];
    questionsForDoctor: string[];
  };
  measurements: Array<{
    name: string;
    value: string;
    unit?: string;
    measuredAt?: string;
  }>;
  medicines: Array<{
    name: string;
    dose?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
  }>;
  diagnoses: string[];
  recommendations: string[];
  nextVisit: string | null;
  confidence: number;
}


const encodePdfToBase64 = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';

  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }

  return btoa(binary);
};

const readString = (value: unknown) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.toLowerCase() === 'null' || trimmed === '') return null;
    return trimmed;
  }
  return null;
};
const readArray = (value: unknown) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []);

const getStructuredSummary = (text: string): GeminiPregnancyReportResponse => {
  try {
    const parsed = JSON.parse(text) as Partial<GeminiPregnancyReportResponse>;

    return {
      reportType: parsed.reportType ?? 'other',
      metadata: {
        title: readString(parsed.metadata?.title),
        hospital: readString(parsed.metadata?.hospital),
        doctor: readString(parsed.metadata?.doctor),
        reportDate: readString(parsed.metadata?.reportDate),
        pregnancyWeek: readString(parsed.metadata?.pregnancyWeek),
      },
      summary: {
        plainEnglish: readString(parsed.summary?.plainEnglish) ?? '',
        importantFindings: readArray(parsed.summary?.importantFindings),
        followUpActions: readArray(parsed.summary?.followUpActions),
        questionsForDoctor: readArray(parsed.summary?.questionsForDoctor),
      },
      measurements: Array.isArray(parsed.measurements)
        ? parsed.measurements.map((m) => ({
            name: readString(m.name) ?? '',
            value: readString(m.value) ?? '',
            unit: readString(m.unit) || undefined,
            measuredAt: readString(m.measuredAt) || undefined,
          }))
        : [],
      medicines: Array.isArray(parsed.medicines)
        ? parsed.medicines.map((m) => ({
            name: readString(m.name) ?? '',
            dose: readString(m.dose) || undefined,
            frequency: readString(m.frequency) || undefined,
            duration: readString(m.duration) || undefined,
            instructions: readString(m.instructions) || undefined,
          }))
        : [],
      diagnoses: readArray(parsed.diagnoses),
      recommendations: readArray(parsed.recommendations),
      nextVisit: readString(parsed.nextVisit),
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    };
  } catch {
    throw new Error('Gemini did not return valid response for the PDF summary.');
  }
};

export const formatPregnancySummary = (summary: GeminiPregnancyReportResponse) => {
  const sections = [summary.summary.plainEnglish];

  if (summary.summary.importantFindings.length > 0) {
    sections.push(`Important findings:\n${summary.summary.importantFindings.map((item) => `• ${item}`).join('\n')}`);
  }

  if (summary.summary.followUpActions.length > 0) {
    sections.push(`Follow-up actions:\n${summary.summary.followUpActions.map((item) => `• ${item}`).join('\n')}`);
  }

  if (summary.summary.questionsForDoctor.length > 0) {
    sections.push(`Questions for doctor:\n${summary.summary.questionsForDoctor.map((item) => `• ${item}`).join('\n')}`);
  }

  return sections.filter(Boolean).join('\n\n');
};

export const summarizePdfReport = async (file: File, userApiKey?: string): Promise<GeminiPregnancyReportResponse> => {
  if (file.type !== 'application/pdf') {
    throw new Error('Please upload a PDF file.');
  }

  const ai = getGeminiClient(userApiKey);
  const model = import.meta.env.VITE_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const pdfData = await encodePdfToBase64(file);

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [
        { text: 'Please summarize this medical report.' },
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: pdfData,
          },
        },
      ],
      config: {
        systemInstruction: SUMMARIZE_REPORT_PROMPT.trim(),
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            reportType: {
              type: 'STRING',
              enum: [
                'ultrasound',
                'blood-test',
                'urine-test',
                'prescription',
                'consultation',
                'vaccination',
                'hospital',
                'genetic-screening',
                'other',
              ],
            },
            metadata: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING' },
                hospital: { type: 'STRING' },
                doctor: { type: 'STRING' },
                reportDate: { type: 'STRING' },
                pregnancyWeek: { type: 'STRING' },
              },
            },
            summary: {
              type: 'OBJECT',
              properties: {
                plainEnglish: { type: 'STRING' },
                importantFindings: {
                  type: 'ARRAY',
                  items: { type: 'STRING' },
                },
                followUpActions: {
                  type: 'ARRAY',
                  items: { type: 'STRING' },
                },
                questionsForDoctor: {
                  type: 'ARRAY',
                  items: { type: 'STRING' },
                },
              },
            },
            measurements: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  name: { type: 'STRING' },
                  value: { type: 'STRING' },
                  unit: { type: 'STRING' },
                  measuredAt: { type: 'STRING' },
                },
                required: ['name', 'value'],
              },
            },
            medicines: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  name: { type: 'STRING' },
                  dose: { type: 'STRING' },
                  frequency: { type: 'STRING' },
                  duration: { type: 'STRING' },
                  instructions: { type: 'STRING' },
                },
              },
            },
            diagnoses: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
            recommendations: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
            nextVisit: { type: 'STRING' },
            confidence: { type: 'NUMBER' },
          },
          required: [
            'reportType',
            'metadata',
            'summary',
            'measurements',
            'medicines',
            'diagnoses',
            'recommendations',
            'nextVisit',
            'confidence',
          ],
        },
      }
    });

    if (!response.text) {
      throw new Error('Gemini returned an empty response for this PDF summary.');
    }

    return getStructuredSummary(response.text);
  } catch (error: any) {
    throw new Error(`Failed to generate a report summary: ${error.message || 'Unknown error'}`);
  }
};
