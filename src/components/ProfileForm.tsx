import React, { useState } from "react";
import {
  EMERGENCY_CONTACT_LIMITS,
  MAX_EMERGENCY_CONTACTS,
  formatEmergencyContactSummary,
  getProfileEmergencyContacts,
  sanitizeEmergencyContacts,
  type EmergencyContact,
  type ExpectantProfile,
} from "../models/profile";

// Exclude system-generated and ownership fields from the user inputs
export type ProfileFormData = Omit<
  ExpectantProfile,
  "id" | "creatorId" | "sharedWith" | "createdAt" | "updatedAt"
>;

interface ProfileFormProps {
  initialData?: Partial<ProfileFormData>;
  onSubmit: (data: ProfileFormData) => void;
  isLoading?: boolean;
  isEditing?: boolean;
}

export default function ProfileForm({
  initialData,
  onSubmit,
  isLoading = false,
  isEditing = false,
}: ProfileFormProps) {
  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: initialData?.fullName || "",
    dateOfBirth: initialData?.dateOfBirth || "",
    location: initialData?.location || "",
    bloodGroup: initialData?.bloodGroup || "",
    lastMenstrualPeriod: initialData?.lastMenstrualPeriod || "",
    expectedDueDate: initialData?.expectedDueDate || "",
    careProvider: initialData?.careProvider || "",
    primaryHospital: initialData?.primaryHospital || "",
    primaryHospitalLocation: initialData?.primaryHospitalLocation || "",
    emergencyContact: initialData?.emergencyContact || "",
    emergencyContacts: getProfileEmergencyContacts({
      emergencyContacts: initialData?.emergencyContacts,
      emergencyContact: initialData?.emergencyContact,
    }),
    status: initialData?.status || "active",
  });

  const contacts = formData.emergencyContacts || [];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactChange = (
    index: number,
    field: keyof EmergencyContact,
    value: string
  ) => {
    setFormData((prev) => {
      const next = [...(prev.emergencyContacts || [])];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, emergencyContacts: next };
    });
  };

  const addContact = () => {
    if (contacts.length >= MAX_EMERGENCY_CONTACTS) return;
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: [
        ...(prev.emergencyContacts || []),
        { name: "", phone: "", relationship: "" },
      ],
    }));
  };

  const removeContact = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: (prev.emergencyContacts || []).filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedContacts = sanitizeEmergencyContacts(formData.emergencyContacts);
    onSubmit({
      ...formData,
      emergencyContacts: cleanedContacts,
      emergencyContact: cleanedContacts[0]
        ? formatEmergencyContactSummary(cleanedContacts[0])
        : "",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto p-6 bg-white rounded-lg shadow border border-gray-100">
      {/* Personal Details Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Personal Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
            <input
              type="date"
              name="dateOfBirth"
              required
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="City, State"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
            <select
              name="bloodGroup"
              value={formData.bloodGroup}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">Select...</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Pregnancy Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Pregnancy Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Menstrual Period *</label>
            <input
              type="date"
              name="lastMenstrualPeriod"
              required
              value={formData.lastMenstrualPeriod}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Due Date *</label>
            <input
              type="date"
              name="expectedDueDate"
              required
              value={formData.expectedDueDate}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Care & Emergency Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Care & Emergency</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Care Provider</label>
            <input
              type="text"
              name="careProvider"
              value={formData.careProvider}
              onChange={handleChange}
              placeholder="Doctor or Midwife name"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Hospital</label>
            <input
              type="text"
              name="primaryHospital"
              value={formData.primaryHospital}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Hospital Location (Maps URL or Address)</label>
            <input
              type="text"
              name="primaryHospitalLocation"
              value={formData.primaryHospitalLocation}
              onChange={handleChange}
              placeholder="https://maps.google.com/..."
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Emergency Contacts</label>
              {contacts.length < MAX_EMERGENCY_CONTACTS && (
                <button
                  type="button"
                  onClick={addContact}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  + Add Contact
                </button>
              )}
            </div>
            {contacts.map((contact, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3 border border-gray-200 rounded-md">
                <input
                  type="text"
                  maxLength={EMERGENCY_CONTACT_LIMITS.name}
                  value={contact.name}
                  onChange={(e) => handleContactChange(index, "name", e.target.value)}
                  placeholder="Name"
                  className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  maxLength={EMERGENCY_CONTACT_LIMITS.relationship}
                  value={contact.relationship || ""}
                  onChange={(e) => handleContactChange(index, "relationship", e.target.value)}
                  placeholder="Relationship (optional)"
                  className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    maxLength={EMERGENCY_CONTACT_LIMITS.phone}
                    value={contact.phone}
                    onChange={(e) => handleContactChange(index, "phone", e.target.value)}
                    placeholder="Phone number"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeContact(index)}
                    className="text-sm text-red-600 hover:text-red-800 px-2"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Profile Status (usually only shown during Edit) */}
      {isEditing && (
        <div className="pt-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Profile Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full md:w-1/2 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      )}

      <div className="pt-6 flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md disabled:opacity-50 transition-colors"
        >
          {isLoading ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </form>
  );
}