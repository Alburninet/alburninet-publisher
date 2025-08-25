// lib/profiles.ts
export type ProfileRole = "admin" | "editor" | "viewer";
export type Profile = {
  id: string;        // es. "mrossi"
  label: string;     // es. "Mario Rossi"
  wpUserId: number;  // ID autore su WordPress
  role: ProfileRole; // opzionale
};

export const PROFILES: Profile[] = [
  { id: "mrossi",   label: "Mario Rossi",   wpUserId: 23, role: "editor" },
  { id: "lbianchi", label: "Lucia Bianchi", wpUserId: 27, role: "editor" },
  { id: "redaz",    label: "Redazione",     wpUserId: 4,  role: "admin"  },
];

export const STORAGE_KEY = "alburninet_profile";