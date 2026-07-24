const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';

type ReportType =
  | 'ultrasound'
  | 'blood-test'
  | 'urine-test'
  | 'prescription'
  | 'consultation'
  | 'vaccination'
  | 'hospital'
  | 'genetic-screening'
  | 'other';

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
  measurements: {
    fetalHeartRate: string | null;
    crl: string | null;
    bpd: string | null;
    hc: string | null;
    ac: string | null;
    fl: string | null;
    estimatedFetalWeight: string | null;
    placenta: string | null;
    amnioticFluid: string | null;
    cervixLength: string | null;
    hemoglobin: string | null;
    bloodGroup: string | null;
    rhFactor: string | null;
    tsh: string | null;
    bloodSugar: string | null;
    vitaminD: string | null;
    vitaminB12: string | null;
    iron: string | null;
    bloodPressure: string | null;
    weight: string | null;
    other: Record<string, unknown>;
  };
  medicines: Array<{
    name: string;
    dose: string;
    frequency: string;
    duration: string;
  }>;
  diagnosesMentioned: string[];
  recommendations: string[];
  nextVisit: string | null;
  confidence: number;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  error?: {
    message?: string;
  };
}

const getGeminiConfig = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const model = import.meta.env.VITE_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  if (!apiKey) {
    throw new Error('Gemini is not configured. Add VITE_GEMINI_API_KEY to your .env file.');
  }

  return { apiKey, model };
};

const readGeminiError = async (response: Response) => {
  const payload = await response.text();

  if (!payload) {
    return `${response.status} ${response.statusText}`;
  }

  try {
    const parsed = JSON.parse(payload) as { error?: { message?: string } };
    return parsed.error?.message || payload;
  } catch {
    return payload;
  }
};

const normalizePublicReportLink = (reportUrl: string) => {
  const trimmed = reportUrl.trim();

  if (!trimmed) {
    throw new Error('Please provide a report link.');
  }

  return trimmed.replace(/^https?:\/\//i, 'https://');
};

const getPdfBytes = async (reportUrl: string) => {
  const normalizedUrl = normalizePublicReportLink(reportUrl);
  const response = await fetch(normalizedUrl, {
    headers: {
      Accept: 'application/pdf,application/octet-stream,*/*',
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch the public report link. ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType && !contentType.includes('pdf') && !/\.pdf(?:$|[?#])/i.test(normalizedUrl)) {
    throw new Error('The report link must point directly to a PDF document.');
  }

  return response.arrayBuffer();
};

const encodePdfToBase64 = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';

  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }

  return btoa(binary);
};

const readString = (value: unknown) => (typeof value === 'string' ? value.trim() : null);
const readArray = (value: unknown) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []);

const getStructuredSummary = (payload: GeminiResponse): GeminiPregnancyReportResponse => {
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini returned an empty response for this PDF summary.');
  }

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
      measurements: {
        fetalHeartRate: readString(parsed.measurements?.fetalHeartRate),
        crl: readString(parsed.measurements?.crl),
        bpd: readString(parsed.measurements?.bpd),
        hc: readString(parsed.measurements?.hc),
        ac: readString(parsed.measurements?.ac),
        fl: readString(parsed.measurements?.fl),
        estimatedFetalWeight: readString(parsed.measurements?.estimatedFetalWeight),
        placenta: readString(parsed.measurements?.placenta),
        amnioticFluid: readString(parsed.measurements?.amnioticFluid),
        cervixLength: readString(parsed.measurements?.cervixLength),
        hemoglobin: readString(parsed.measurements?.hemoglobin),
        bloodGroup: readString(parsed.measurements?.bloodGroup),
        rhFactor: readString(parsed.measurements?.rhFactor),
        tsh: readString(parsed.measurements?.tsh),
        bloodSugar: readString(parsed.measurements?.bloodSugar),
        vitaminD: readString(parsed.measurements?.vitaminD),
        vitaminB12: readString(parsed.measurements?.vitaminB12),
        iron: readString(parsed.measurements?.iron),
        bloodPressure: readString(parsed.measurements?.bloodPressure),
        weight: readString(parsed.measurements?.weight),
        other: typeof parsed.measurements?.other === 'object' && parsed.measurements?.other !== null
          ? parsed.measurements.other
          : {},
      },
      medicines: Array.isArray(parsed.medicines)
        ? parsed.medicines.map(
            (medicine: {
              name?: unknown;
              dose?: unknown;
              frequency?: unknown;
              duration?: unknown;
            }) => ({
              name: readString(medicine?.name) ?? '',
              dose: readString(medicine?.dose) ?? '',
              frequency: readString(medicine?.frequency) ?? '',
              duration: readString(medicine?.duration) ?? '',
            }),
          )
        : [],
      diagnosesMentioned: readArray(parsed.diagnosesMentioned),
      recommendations: readArray(parsed.recommendations),
      nextVisit: readString(parsed.nextVisit),
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    };
  } catch {
    throw new Error('Gemini did not return valid JSON for the PDF summary.');
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

export const summarizePdfReport = async (file: File): Promise<GeminiPregnancyReportResponse> => {
  if (file.type !== 'application/pdf') {
    throw new Error('Please upload a PDF file.');
  }

  const { apiKey, model } = getGeminiConfig();
  const pdfData = await encodePdfToBase64(file);

  const prompt = `You are an AI assistant that helps organize pregnancy medical records.

Your job is to extract factual information from a pregnancy-related medical document.

Instructions:
- Never diagnose medical conditions.
- Never recommend treatment.
- Never infer values that are not explicitly present.
- Preserve medical terminology exactly as written.
- If a field is unavailable, return null.
- If you are uncertain, return null instead of guessing.
- Return ONLY valid JSON.
- Do not wrap the JSON in markdown.

Tasks:
1. Determine the report type.
2. Extract metadata.
3. Extract measurements.
4. Extract medicines if present.
5. Extract doctor recommendations.
6. Generate a concise factual summary.
7. Suggest questions that the patient may wish to ask their healthcare provider (only based on information present in the report).

Response structured schema:
{
  "reportType": "ultrasound | blood-test | urine-test | prescription | consultation | vaccination | hospital | genetic-screening | other",
  "metadata": {
    "title": null,
    "hospital": null,
    "doctor": null,
    "reportDate": null,
    "pregnancyWeek": null
  },
  "summary": {
    "plainEnglish": "",
    "importantFindings": [],
    "followUpActions": [],
    "questionsForDoctor": []
  },
  "measurements": {
    "fetalHeartRate": null,
    "crl": null,
    "bpd": null,
    "hc": null,
    "ac": null,
    "fl": null,
    "estimatedFetalWeight": null,
    "placenta": null,
    "amnioticFluid": null,
    "cervixLength": null,
    "hemoglobin": null,
    "bloodGroup": null,
    "rhFactor": null,
    "tsh": null,
    "bloodSugar": null,
    "vitaminD": null,
    "vitaminB12": null,
    "iron": null,
    "bloodPressure": null,
    "weight": null,
    "other": {}
  },
  "medicines": [
    {
      "name": "",
      "dose": "",
      "frequency": "",
      "duration": ""
    }
  ],
  "diagnosesMentioned": [],
  "recommendations": [],
  "nextVisit": null,
  "confidence": 0.0
}

The document is in the attached PDF. Extract only what is explicitly present in the document and avoid any diagnosis or treatment advice.`;

  const summaryResponse = await fetch(`${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: pdfData,
              },
            },
          ],
        },
      ],
      generationConfig: {
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
              type: 'OBJECT',
              properties: {
                fetalHeartRate: { type: 'STRING' },
                crl: { type: 'STRING' },
                bpd: { type: 'STRING' },
                hc: { type: 'STRING' },
                ac: { type: 'STRING' },
                fl: { type: 'STRING' },
                estimatedFetalWeight: { type: 'STRING' },
                placenta: { type: 'STRING' },
                amnioticFluid: { type: 'STRING' },
                cervixLength: { type: 'STRING' },
                hemoglobin: { type: 'STRING' },
                bloodGroup: { type: 'STRING' },
                rhFactor: { type: 'STRING' },
                tsh: { type: 'STRING' },
                bloodSugar: { type: 'STRING' },
                vitaminD: { type: 'STRING' },
                vitaminB12: { type: 'STRING' },
                iron: { type: 'STRING' },
                bloodPressure: { type: 'STRING' },
                weight: { type: 'STRING' },
                other: {
                  type: 'OBJECT',
                },
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
                },
              },
            },
            diagnosesMentioned: {
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
            'diagnosesMentioned',
            'recommendations',
            'nextVisit',
            'confidence',
          ],
        },
      },
    }),
  });

  if (!summaryResponse.ok) {
    const message = await readGeminiError(summaryResponse);
    throw new Error(`Failed to generate a report summary: ${message}`);
  }

  const summaryPayload = (await summaryResponse.json()) as GeminiResponse;

  return getStructuredSummary(summaryPayload);
};

export const summarizePublicReportUrl = async (reportUrl: string): Promise<GeminiPregnancyReportResponse> => {
  if (!reportUrl.trim()) {
    throw new Error('Please provide a public report link.');
  }

  const { apiKey, model } = getGeminiConfig();
  const pdfBuffer = await getPdfBytes(reportUrl);
  const bytes = new Uint8Array(pdfBuffer);
  let binary = '';

  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }

  const pdfData = btoa(binary);

  const prompt = `You are an AI assistant that helps organize pregnancy medical records.

Your job is to extract factual information from a pregnancy-related medical document.

Instructions:
- Never diagnose medical conditions.
- Never recommend treatment.
- Never infer values that are not explicitly present.
- Preserve medical terminology exactly as written.
- If a field is unavailable, return null.
- If you are uncertain, return null instead of guessing.
- Return ONLY valid JSON.
- Do not wrap the JSON in markdown.

Tasks:
1. Determine the report type.
2. Extract metadata.
3. Extract measurements.
4. Extract medicines if present.
5. Extract doctor recommendations.
6. Generate a concise factual summary.
7. Suggest questions that the patient may wish to ask their healthcare provider (only based on information present in the report).

Response structured schema:
{
  "reportType": "ultrasound | blood-test | urine-test | prescription | consultation | vaccination | hospital | genetic-screening | other",
  "metadata": {
    "title": null,
    "hospital": null,
    "doctor": null,
    "reportDate": null,
    "pregnancyWeek": null
  },
  "summary": {
    "plainEnglish": "",
    "importantFindings": [],
    "followUpActions": [],
    "questionsForDoctor": []
  },
  "measurements": {
    "fetalHeartRate": null,
    "crl": null,
    "bpd": null,
    "hc": null,
    "ac": null,
    "fl": null,
    "estimatedFetalWeight": null,
    "placenta": null,
    "amnioticFluid": null,
    "cervixLength": null,
    "hemoglobin": null,
    "bloodGroup": null,
    "rhFactor": null,
    "tsh": null,
    "bloodSugar": null,
    "vitaminD": null,
    "vitaminB12": null,
    "iron": null,
    "bloodPressure": null,
    "weight": null,
    "other": {}
  },
  "medicines": [
    {
      "name": "",
      "dose": "",
      "frequency": "",
      "duration": ""
    }
  ],
  "diagnosesMentioned": [],
  "recommendations": [],
  "nextVisit": null,
  "confidence": 0.0
}

The document is in the attached PDF. Extract only what is explicitly present in the document and avoid any diagnosis or treatment advice.`;

  const summaryResponse = await fetch(`${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: pdfData,
              },
            },
          ],
        },
      ],
      generationConfig: {
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
              type: 'OBJECT',
              properties: {
                fetalHeartRate: { type: 'STRING' },
                crl: { type: 'STRING' },
                bpd: { type: 'STRING' },
                hc: { type: 'STRING' },
                ac: { type: 'STRING' },
                fl: { type: 'STRING' },
                estimatedFetalWeight: { type: 'STRING' },
                placenta: { type: 'STRING' },
                amnioticFluid: { type: 'STRING' },
                cervixLength: { type: 'STRING' },
                hemoglobin: { type: 'STRING' },
                bloodGroup: { type: 'STRING' },
                rhFactor: { type: 'STRING' },
                tsh: { type: 'STRING' },
                bloodSugar: { type: 'STRING' },
                vitaminD: { type: 'STRING' },
                vitaminB12: { type: 'STRING' },
                iron: { type: 'STRING' },
                bloodPressure: { type: 'STRING' },
                weight: { type: 'STRING' },
                other: {
                  type: 'OBJECT',
                },
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
                },
              },
            },
            diagnosesMentioned: {
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
            'diagnosesMentioned',
            'recommendations',
            'nextVisit',
            'confidence',
          ],
        },
      },
    }),
  });

  if (!summaryResponse.ok) {
    const message = await readGeminiError(summaryResponse);
    throw new Error(`Failed to generate a report summary: ${message}`);
  }

  const summaryPayload = (await summaryResponse.json()) as GeminiResponse;

  return getStructuredSummary(summaryPayload);
};
