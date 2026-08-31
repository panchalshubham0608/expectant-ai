import { SUMMARIZE_REPORT_PROMPT } from "../../prompts/summarize_report";
import { getGeminiClient, DEFAULT_GEMINI_MODEL } from './geminiCore';

import type { Report, ReportType } from '../../models/report';

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
  historicalComparison?: {
    measurement: string;
    current: {
      value: string;
      unit?: string | null;
      reportDate?: string | null;
      pregnancyWeek?: number | null;
    };
    previous: {
      value: string;
      unit?: string | null;
      reportDate?: string | null;
      pregnancyWeek?: number | null;
    }[];
    observation: string;
  }[];
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
      historicalComparison: Array.isArray(parsed.historicalComparison)
        ? parsed.historicalComparison.map((hc: any) => ({
          measurement: readString(hc?.measurement) ?? '',
          current: {
            value: readString(hc?.current?.value) ?? '',
            unit: readString(hc?.current?.unit),
            reportDate: readString(hc?.current?.reportDate),
            pregnancyWeek: typeof hc?.current?.pregnancyWeek === 'number' ? hc.current.pregnancyWeek : null,
          },
          previous: Array.isArray(hc?.previous)
            ? hc.previous.map((p: any) => ({
              value: readString(p?.value) ?? '',
              unit: readString(p?.unit),
              reportDate: readString(p?.reportDate),
              pregnancyWeek: typeof p?.pregnancyWeek === 'number' ? p.pregnancyWeek : null,
            }))
            : [],
          observation: readString(hc?.observation) ?? '',
        }))
        : undefined,
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

export const summarizePdfReport = async (file: File, historicalReports: Report[] = [], userApiKey?: string): Promise<GeminiPregnancyReportResponse> => {
  if (file.type !== 'application/pdf') {
    throw new Error('Please upload a PDF file.');
  }

  const ai = getGeminiClient(userApiKey);
  const model = import.meta.env.VITE_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const pdfData = await encodePdfToBase64(file);
  const systemInstructions = SUMMARIZE_REPORT_PROMPT.trim();

  const contents: any[] = [
    { text: 'Please summarize this medical report.' },
    {
      inlineData: {
        mimeType: 'application/pdf',
        data: pdfData,
      },
    },
  ];

  if (historicalReports.length > 0) {
    const historyText = JSON.stringify(
      historicalReports.map((r) => ({
        reportType: r.reportType,
        reportDate: r.reportDate,
        metadata: r.metadata,
        measurements: r.measurements,
        diagnoses: r.diagnoses,
        medicines: r.medicines,
      }))
    );
    systemInstructions.replace('{historical_reports}', historyText);
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents,
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
            historicalComparison: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  measurement: { type: 'STRING' },
                  current: {
                    type: 'OBJECT',
                    properties: {
                      value: { type: 'STRING' },
                      unit: { type: 'STRING' },
                      reportDate: { type: 'STRING' },
                      pregnancyWeek: { type: 'NUMBER' },
                    },
                    required: ['value'],
                  },
                  previous: {
                    type: 'ARRAY',
                    items: {
                      type: 'OBJECT',
                      properties: {
                        value: { type: 'STRING' },
                        unit: { type: 'STRING' },
                        reportDate: { type: 'STRING' },
                        pregnancyWeek: { type: 'NUMBER' },
                      },
                      required: ['value'],
                    },
                  },
                  observation: { type: 'STRING' },
                },
                required: ['measurement', 'current', 'previous', 'observation'],
              },
            },
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
