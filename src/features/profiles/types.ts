export type ProfileInput = {
  fullName: string;
  dateOfBirth: string;
  lastMenstrualPeriod: string;
  location: string;
  bloodGroup: string;
  expectedDueDate: string;
  emergencyContact: string;
  careProvider: string;
};

export type Profile = ProfileInput & {
  id: string;
};
