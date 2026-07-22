import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';

export type ProfileFormData = {
  fullName: string;
  dateOfBirth: string;
  lastMenstrualPeriod: string;
  location: string;
  bloodGroup: string;
  expectedDueDate: string;
  emergencyContact: string;
  careProvider: string;
};

const emptyProfileForm: ProfileFormData = {
  fullName: '',
  dateOfBirth: '',
  lastMenstrualPeriod: '',
  location: '',
  bloodGroup: '',
  expectedDueDate: '',
  emergencyContact: '',
  careProvider: '',
};

type ProfileFormDialogProps = {
  initialValues?: ProfileFormData;
  mode: 'create' | 'edit';
  onClose: () => void;
  onSubmit: (profile: ProfileFormData) => void;
};

const inputClass =
  'mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-green-600 focus:ring-4 focus:ring-green-100';

export default function ProfileFormDialog({
  initialValues = emptyProfileForm,
  mode,
  onClose,
  onSubmit,
}: ProfileFormDialogProps) {
  const [form, setForm] = useState<ProfileFormData>(initialValues);
  const titleId = useId();
  const isEditing = mode === 'edit';

  const update = (field: keyof ProfileFormData, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleLmpChange = (value: string) => {
    update('lastMenstrualPeriod', value);
    if (value && !form.expectedDueDate) {
      const dueDate = new Date(`${value}T00:00:00`);
      dueDate.setDate(dueDate.getDate() + 280);
      update('expectedDueDate', dueDate.toISOString().slice(0, 10));
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(form);
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
              placeholder="e.g. Priya Sharma"
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
            <p className="mt-2 text-xs leading-5 text-gray-500">
              We use this to estimate pregnancy week and due date. You can adjust the due date
              below.
            </p>
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
              Useful if you need quick access to important contacts.
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
                  htmlFor={`${titleId}-emergencyContact`}
                  className="text-sm font-medium text-gray-700"
                >
                  Emergency contact
                </label>
                <input
                  id={`${titleId}-emergencyContact`}
                  value={form.emergencyContact}
                  onChange={(event) => update('emergencyContact', event.target.value)}
                  placeholder="Name and phone number"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-green-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800"
            >
              {isEditing ? 'Save changes' : 'Create profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
