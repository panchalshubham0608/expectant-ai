import type { ExpectantProfile } from "../../models/profile";

export type ProfileInput = Omit<
  ExpectantProfile,
  "id" | "creatorId" | "sharedWith" | "createdAt" | "updatedAt"
>;

export type Profile = ExpectantProfile;
