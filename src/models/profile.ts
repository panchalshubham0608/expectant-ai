export interface EmergencyContact {
  name: string;
  phone: string;
  relationship?: string;
}

export const MAX_EMERGENCY_CONTACTS = 10;

export const EMERGENCY_CONTACT_LIMITS = {
  name: 100,
  phone: 40,
  relationship: 60,
} as const;

export const EMERGENCY_RELATIONSHIP_SUGGESTIONS = [
  "Partner",
  "Spouse",
  "Mother",
  "Father",
  "Sibling",
  "Doctor",
  "Hospital",
  "Friend",
] as const;

export interface ExpectantProfile {
  id: string;

  // Ownership
  creatorId: string;
  sharedWith: string[];

  // Personal Details
  fullName: string;
  dateOfBirth: string;
  location?: string;
  bloodGroup?: string;

  // Pregnancy
  lastMenstrualPeriod: string;
  ultrasoundLastMenstrualPeriod?: string;
  expectedDueDate: string;

  // Care
  careProvider?: string;
  primaryHospital?: string;
  primaryHospitalLocation?: string;
  /** @deprecated Use emergencyContacts instead. Kept synced for backward compatibility. */
  emergencyContact?: string;
  emergencyContacts?: EmergencyContact[];

  // Integrations
  googleCalendarId?: string;
  syncRemindersToCalendar?: boolean;
  syncAppointmentsToCalendar?: boolean;

  // Baby Name Generation
  babyNameContext?: string;
  babyNameCount?: number;

  // Spiritual Sloka Generation
  spiritualSlokaContext?: string;

  // Talking to the Womb (Baby Talk)
  babyTalkEnabled?: boolean;
  babyTalkContext?: string;

  // Custom Message from Partner
  customMessage?: string;
  customMessageUpdatedAt?: string;
  customMessageDismissed?: boolean;

  // Status
  status: "active" | "completed" | "archived";

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

const trimAndCap = (value: unknown, maxLength: number): string => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
};

export const sanitizeTelHref = (phone: string): string | null => {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const hasLeadingPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 3) return null;
  return `tel:${hasLeadingPlus ? "+" : ""}${digits}`;
};

export const hasValidEmergencyPhone = (phone: string): boolean => {
  const trimmed = phone.trim();
  if (!trimmed || trimmed.length > EMERGENCY_CONTACT_LIMITS.phone) return false;
  if (!/^[+\d\s().-]+$/.test(trimmed)) return false;
  return sanitizeTelHref(trimmed) !== null;
};

export const parseLegacyEmergencyContact = (raw: unknown): EmergencyContact | null => {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().slice(0, 200);
  if (!trimmed) return null;

  if (/^[+\d\s().-]+$/.test(trimmed) && trimmed.replace(/\D/g, "").length >= 3) {
    return {
      name: "",
      phone: trimmed.slice(0, EMERGENCY_CONTACT_LIMITS.phone),
    };
  }

  const phonePattern = /(?:\+?\d|\(\d{2,5}\))[\d\s().-]{4,}\d/g;
  let bestMatch: { text: string; index: number; digitCount: number } | null = null;

  for (const match of trimmed.matchAll(phonePattern)) {
    const text = match[0].trim();
    const digitCount = text.replace(/\D/g, "").length;
    if (digitCount >= 6 && (!bestMatch || digitCount > bestMatch.digitCount)) {
      bestMatch = { text, index: match.index ?? 0, digitCount };
    }
  }

  if (!bestMatch) {
    return {
      name: trimmed.slice(0, EMERGENCY_CONTACT_LIMITS.name),
      phone: "",
    };
  }

  const before = trimmed.slice(0, bestMatch.index);
  const after = trimmed.slice(bestMatch.index + bestMatch.text.length);
  let label = `${before} ${after}`
    .replace(/\s+/g, " ")
    .replace(/^[\s\-:|•·,]+|[\s\-:|•·,]+$/g, "")
    .trim();

  if (label.startsWith("(") && label.endsWith(")") && !label.slice(1, -1).includes("(")) {
    label = label.slice(1, -1).trim();
  }

  let name = label;
  let relationship = "";
  const relationMatch = label.match(/^(.+?)\s*\(([^()]+)\)$/);
  if (relationMatch) {
    name = relationMatch[1].trim();
    relationship = relationMatch[2].trim();
  }

  const contact: EmergencyContact = {
    name: name.slice(0, EMERGENCY_CONTACT_LIMITS.name),
    phone: bestMatch.text.slice(0, EMERGENCY_CONTACT_LIMITS.phone),
  };
  if (relationship) {
    contact.relationship = relationship.slice(0, EMERGENCY_CONTACT_LIMITS.relationship);
  }
  return contact;
};

export const sanitizeEmergencyContacts = (contacts: unknown): EmergencyContact[] => {
  if (!Array.isArray(contacts)) return [];

  const sanitized: EmergencyContact[] = [];
  for (const item of contacts) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const name = trimAndCap(record.name, EMERGENCY_CONTACT_LIMITS.name);
    const phone = trimAndCap(record.phone, EMERGENCY_CONTACT_LIMITS.phone);
    const relationship = trimAndCap(record.relationship, EMERGENCY_CONTACT_LIMITS.relationship);

    if (!name && !phone) continue;

    const contact: EmergencyContact = { name, phone };
    if (relationship) {
      contact.relationship = relationship;
    }
    sanitized.push(contact);

    if (sanitized.length >= MAX_EMERGENCY_CONTACTS) break;
  }

  return sanitized;
};

export const getProfileEmergencyContacts = (
  profile: Pick<ExpectantProfile, "emergencyContacts" | "emergencyContact">,
): EmergencyContact[] => {
  if (Array.isArray(profile.emergencyContacts)) {
    return sanitizeEmergencyContacts(profile.emergencyContacts);
  }
  const legacy = parseLegacyEmergencyContact(profile.emergencyContact);
  return legacy ? [legacy] : [];
};

export const formatEmergencyContactSummary = (contact: EmergencyContact): string => {
  const name = contact.name.trim();
  const phone = contact.phone.trim();
  const relationship = contact.relationship?.trim();
  const displayName = name && relationship ? `${name} (${relationship})` : name || relationship || "";

  if (displayName && phone) return `${displayName} · ${phone}`;
  return displayName || phone;
};