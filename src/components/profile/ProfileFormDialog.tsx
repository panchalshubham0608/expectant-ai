import { useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ChevronDown, ChevronUp, Phone, Plus, Trash2, X } from 'lucide-react';
import {
  EMERGENCY_CONTACT_LIMITS,
  EMERGENCY_RELATIONSHIP_SUGGESTIONS,
  MAX_EMERGENCY_CONTACTS,
  formatEmergencyContactSummary,
  getProfileEmergencyContacts,
  hasValidEmergencyPhone,
  sanitizeEmergencyContacts,
  type EmergencyContact,
} from '../../models/profile';
import type { ProfileInput } from '../../services/profiles/profileService';

export type { ProfileInput as ProfileFormData } from '../../services/profiles/profileService';

type ProfileFormDialogProps = {
  initialValues?: Partial<ProfileInput>;
  mode: 'create' | 'edit';
  submitError?: string;
  onClose: () => void;
  onSubmit: (profile: ProfileInput) => void | Promise<void>;
};

type EmergencyContactDraft = {
  key: string;
  name: string;
  phone: string;
  relationship: string;
};

type ContactFieldErrors = {
  name?: string;
  phone?: string;
};

const inputClass =
  'mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-green-600 focus:ring-4 focus:ring-green-100';

const contactInputClass =
  'mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-green-600 focus:ring-4 focus:ring-green-100';

export default function ProfileFormDialog({
  initialValues,
  mode,
  submitError,
  onClose,
  onSubmit,
}: ProfileFormDialogProps) {
  const nextDraftId = useRef(0);
  const createDraftKey = () => {
    nextDraftId.current += 1;
    return `contact-${nextDraftId.current}`;
  };

  const [form, setForm] = useState({
    fullName: initialValues?.fullName || '',
    dateOfBirth: initialValues?.dateOfBirth || '',
    lastMenstrualPeriod: initialValues?.lastMenstrualPeriod || '',
    ultrasoundLastMenstrualPeriod: initialValues?.ultrasoundLastMenstrualPeriod || '',
    location: initialValues?.location || '',
    bloodGroup: initialValues?.bloodGroup || '',
    expectedDueDate: initialValues?.expectedDueDate || '',
    careProvider: initialValues?.careProvider || '',
    primaryHospital: initialValues?.primaryHospital || '',
    primaryHospitalLocation: initialValues?.primaryHospitalLocation || '',
    status: initialValues?.status || ('active' as ProfileInput['status']),
  });

  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContactDraft[]>(() =>
    getProfileEmergencyContacts({
      emergencyContacts: initialValues?.emergencyContacts,
      emergencyContact: initialValues?.emergencyContact,
    }).map((contact, idx) => ({
      key: `initial-${idx}`,
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship || '',
    })),
  );
  const [contactErrors, setContactErrors] = useState<Record<string, ContactFieldErrors>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleId = useId();
  const relationshipListId = `${titleId}-relationship-suggestions`;
  const isEditing = mode === 'edit';

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleLmpChange = (value: string) => {
    setForm((current) => {
      const updates: Partial<typeof form> = { lastMenstrualPeriod: value };
      if (value && !current.expectedDueDate) {
        const dueDate = new Date(`${value}T00:00:00`);
        dueDate.setDate(dueDate.getDate() + 280);
        updates.expectedDueDate = dueDate.toISOString().slice(0, 10);
      }
      return { ...current, ...updates };
    });
  };

  const addEmergencyContact = () => {
    if (emergencyContacts.length >= MAX_EMERGENCY_CONTACTS) return;
    setEmergencyContacts((current) => [
      ...current,
      { key: createDraftKey(), name: '', phone: '', relationship: '' },
    ]);
  };

  const updateEmergencyContact = (
    key: string,
    field: keyof EmergencyContact,
    value: string,
  ) => {
    setEmergencyContacts((current) =>
      current.map((contact) =>
        contact.key === key ? { ...contact, [field]: value } : contact,
      ),
    );
    if (field === 'name' || field === 'phone') {
      setContactErrors((current) => {
        const existing = current[key];
        if (!existing || !existing[field]) return current;
        const nextForKey = { ...existing };
        delete nextForKey[field];
        const next = { ...current };
        if (Object.keys(nextForKey).length === 0) {
          delete next[key];
        } else {
          next[key] = nextForKey;
        }
        return next;
      });
    }
  };

  const removeEmergencyContact = (key: string) => {
    setEmergencyContacts((current) => current.filter((contact) => contact.key !== key));
    setContactErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const moveEmergencyContact = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= emergencyContacts.length) return;
    setEmergencyContacts((current) => {
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const validationErrors: Record<string, ContactFieldErrors> = {};
    const filledContacts: EmergencyContact[] = [];

    for (const draft of emergencyContacts) {
      const name = draft.name.trim();
      const phone = draft.phone.trim();
      const relationship = draft.relationship.trim();

      if (!name && !phone && !relationship) {
        continue;
      }

      const rowError: ContactFieldErrors = {};
      if (!name) {
        rowError.name = 'Enter a contact name.';
      }
      if (!phone) {
        rowError.phone = 'Enter a phone number.';
      } else if (!hasValidEmergencyPhone(phone)) {
        rowError.phone = 'Enter a valid phone number (digits, +, spaces, dashes, or parentheses).';
      }

      if (rowError.name || rowError.phone) {
        validationErrors[draft.key] = rowError;
      } else {
        const cleaned: EmergencyContact = { name, phone };
        if (relationship) {
          cleaned.relationship = relationship;
        }
        filledContacts.push(cleaned);
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setContactErrors(validationErrors);
      return;
    }

    setContactErrors({});
    const sanitizedContacts = sanitizeEmergencyContacts(filledContacts);
    const primarySummary = sanitizedContacts[0]
      ? formatEmergencyContactSummary(sanitizedContacts[0])
      : '';

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...form,
        emergencyContacts: sanitizedContacts,
        emergencyContact: primarySummary,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[2px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="max-h-[84dvh] w-full max-w-xl overflow-y-auto rounded-[2rem] bg-[#faf9f6] shadow-2xl sm:max-h-[90vh]">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-[#faf9f6]/95 px-5 py-4 backdrop-blur sm:px-6 sm:py-5">
          <div>
            <p className="text-sm font-medium text-green-700">Expectant AI</p>
            <h2 id={titleId} className="mt-1 text-2xl font-semibold text-gray-900">
              {isEditing ? 'Edit profile' : 'Create a profile'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              A few details help personalize care and reminders.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close form"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
          <div>
            <label htmlFor={`${titleId}-fullName`} className="text-sm font-medium text-gray-800">
              Full name <span className="text-red-500">*</span>
            </label>
            <input
              id={`${titleId}-fullName`}
              required
              value={form.fullName}
              onChange={(event) => update('fullName', event.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${titleId}-dateOfBirth`}
                className="text-sm font-medium text-gray-800"
              >
                Date of birth <span className="text-red-500">*</span>
              </label>
              <input
                id={`${titleId}-dateOfBirth`}
                required
                type="date"
                value={form.dateOfBirth}
                onChange={(event) => update('dateOfBirth', event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor={`${titleId}-bloodGroup`}
                className="text-sm font-medium text-gray-800"
              >
                Blood group
              </label>
              <select
                id={`${titleId}-bloodGroup`}
                value={form.bloodGroup}
                onChange={(event) => update('bloodGroup', event.target.value)}
                className={inputClass}
              >
                <option value="">Select blood group</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => (
                  <option key={group}>{group}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${titleId}-lastMenstrualPeriod`}
                className="text-sm font-medium text-gray-800"
              >
                Last menstrual period <span className="text-red-500">*</span>
              </label>
              <input
                id={`${titleId}-lastMenstrualPeriod`}
                required
                type="date"
                value={form.lastMenstrualPeriod}
                onChange={(event) => handleLmpChange(event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor={`${titleId}-ultrasoundLastMenstrualPeriod`}
                className="text-sm font-medium text-gray-800"
              >
                Ultrasound-equivalent LMP
              </label>
              <input
                id={`${titleId}-ultrasoundLastMenstrualPeriod`}
                type="date"
                value={form.ultrasoundLastMenstrualPeriod || ''}
                onChange={(event) => update('ultrasoundLastMenstrualPeriod', event.target.value)}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2 -mt-3">
              <p className="text-xs leading-5 text-gray-500">
                We use this to estimate pregnancy week and due date. You can adjust the due date
                below.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${titleId}-expectedDueDate`}
                className="text-sm font-medium text-gray-800"
              >
                Expected due date <span className="text-red-500">*</span>
              </label>
              <input
                id={`${titleId}-expectedDueDate`}
                required
                type="date"
                value={form.expectedDueDate}
                onChange={(event) => update('expectedDueDate', event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={`${titleId}-location`} className="text-sm font-medium text-gray-800">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                id={`${titleId}-location`}
                required
                value={form.location}
                onChange={(event) => update('location', event.target.value)}
                placeholder="City, State"
                className={inputClass}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-green-100 bg-green-50/60 p-4">
            <p className="text-sm font-semibold text-gray-800">Optional care details</p>
            <p className="mt-1 text-xs text-gray-500">
              Keep your OB-GYN and hospital details handy for quick reference.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor={`${titleId}-careProvider`}
                  className="text-sm font-medium text-gray-700"
                >
                  OB-GYN or care provider
                </label>
                <input
                  id={`${titleId}-careProvider`}
                  value={form.careProvider}
                  onChange={(event) => update('careProvider', event.target.value)}
                  placeholder="Dr. name or clinic"
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor={`${titleId}-primaryHospital`}
                  className="text-sm font-medium text-gray-700"
                >
                  Primary hospital
                </label>
                <input
                  id={`${titleId}-primaryHospital`}
                  value={form.primaryHospital || ''}
                  onChange={(event) => update('primaryHospital', event.target.value)}
                  placeholder="Hospital name"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor={`${titleId}-primaryHospitalLocation`}
                  className="text-sm font-medium text-gray-700"
                >
                  Hospital location
                </label>
                <input
                  id={`${titleId}-primaryHospitalLocation`}
                  value={form.primaryHospitalLocation || ''}
                  onChange={(event) => update('primaryHospitalLocation', event.target.value)}
                  placeholder="Maps URL or Address"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-green-100 bg-green-50/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                  <Phone size={15} className="text-green-700" />
                  Emergency contacts
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Add people to reach quickly in an emergency. The first contact is shown as primary.
                </p>
              </div>
              {emergencyContacts.length > 0 && emergencyContacts.length < MAX_EMERGENCY_CONTACTS && (
                <button
                  type="button"
                  onClick={addEmergencyContact}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-green-700 shadow-sm ring-1 ring-green-200 transition hover:bg-green-50"
                >
                  <Plus size={14} />
                  Add contact
                </button>
              )}
            </div>

            <datalist id={relationshipListId}>
              {EMERGENCY_RELATIONSHIP_SUGGESTIONS.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>

            {emergencyContacts.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-white/90 p-4 text-center">
                <p className="text-xs text-gray-500">No emergency contacts added yet.</p>
                <button
                  type="button"
                  onClick={addEmergencyContact}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-green-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-green-800"
                >
                  <Plus size={14} />
                  Add emergency contact
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {emergencyContacts.map((contact, index) => {
                  const rowError = contactErrors[contact.key];
                  return (
                    <div
                      key={contact.key}
                      className="rounded-xl border border-gray-200/80 bg-white p-3.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Contact {index + 1}
                          </span>
                          {index === 0 && emergencyContacts.length > 1 && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200/70">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {emergencyContacts.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={() => moveEmergencyContact(index, -1)}
                                disabled={index === 0}
                                className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
                                aria-label={`Move emergency contact ${index + 1} up`}
                              >
                                <ChevronUp size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveEmergencyContact(index, 1)}
                                disabled={index === emergencyContacts.length - 1}
                                className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
                                aria-label={`Move emergency contact ${index + 1} down`}
                              >
                                <ChevronDown size={16} />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => removeEmergencyContact(contact.key)}
                            className="rounded-lg p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                            aria-label={`Remove emergency contact ${index + 1}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor={`${titleId}-contact-name-${contact.key}`}
                            className="text-xs font-medium text-gray-700"
                          >
                            Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            id={`${titleId}-contact-name-${contact.key}`}
                            type="text"
                            maxLength={EMERGENCY_CONTACT_LIMITS.name}
                            value={contact.name}
                            onChange={(event) =>
                              updateEmergencyContact(contact.key, 'name', event.target.value)
                            }
                            placeholder="e.g., Rahul Sharma"
                            className={`${contactInputClass} ${
                              rowError?.name
                                ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                                : ''
                            }`}
                          />
                          {rowError?.name && (
                            <p className="mt-1 text-xs text-red-600">{rowError.name}</p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor={`${titleId}-contact-relationship-${contact.key}`}
                            className="text-xs font-medium text-gray-700"
                          >
                            Relationship <span className="text-gray-400">(optional)</span>
                          </label>
                          <input
                            id={`${titleId}-contact-relationship-${contact.key}`}
                            type="text"
                            list={relationshipListId}
                            maxLength={EMERGENCY_CONTACT_LIMITS.relationship}
                            value={contact.relationship}
                            onChange={(event) =>
                              updateEmergencyContact(
                                contact.key,
                                'relationship',
                                event.target.value,
                              )
                            }
                            placeholder="e.g., Partner, Mother, Doctor"
                            className={contactInputClass}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label
                            htmlFor={`${titleId}-contact-phone-${contact.key}`}
                            className="text-xs font-medium text-gray-700"
                          >
                            Phone number <span className="text-red-500">*</span>
                          </label>
                          <input
                            id={`${titleId}-contact-phone-${contact.key}`}
                            type="tel"
                            inputMode="tel"
                            maxLength={EMERGENCY_CONTACT_LIMITS.phone}
                            value={contact.phone}
                            onChange={(event) =>
                              updateEmergencyContact(contact.key, 'phone', event.target.value)
                            }
                            placeholder="e.g., +91 98765 43210"
                            className={`${contactInputClass} ${
                              rowError?.phone
                                ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                                : ''
                            }`}
                          />
                          {rowError?.phone && (
                            <p className="mt-1 text-xs text-red-600">{rowError.phone}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {emergencyContacts.length < MAX_EMERGENCY_CONTACTS ? (
                  <button
                    type="button"
                    onClick={addEmergencyContact}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 transition hover:text-green-900"
                  >
                    <Plus size={15} />
                    Add another emergency contact
                  </button>
                ) : (
                  <p className="text-xs text-gray-500">
                    Maximum of {MAX_EMERGENCY_CONTACTS} emergency contacts reached.
                  </p>
                )}
              </div>
            )}
          </div>

          {submitError && (
            <p
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {submitError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-green-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Save changes' : 'Create profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
