"use client";
import React from "react";
import { PROFILES, STORAGE_KEY, Profile } from "@/lib/profiles";

type Ctx = {
  profile: Profile | null;
  setProfileId: (id: string) => void;
  loginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  profiles: Profile[];
};

export const ProfileCtx = React.createContext<Ctx>({
  profile: null,
  setProfileId: () => {},
  loginOpen: false,
  openLogin: () => {},
  closeLogin: () => {},
  profiles: [],
});

export default function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loginOpen, setLoginOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const p = PROFILES.find((x) => x.id === parsed?.id);
        if (p) setProfile(p);
        else setLoginOpen(true);
      } else {
        setLoginOpen(true);
      }
    } catch {
      setLoginOpen(true);
    }
  }, []);

  const setProfileId = (id: string) => {
    const p = PROFILES.find((x) => x.id === id) || null;
    setProfile(p);
    try {
      if (p) localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: p.id }));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const value: Ctx = {
    profile,
    setProfileId,
    loginOpen,
    openLogin: () => setLoginOpen(true),
    closeLogin: () => setLoginOpen(false),
    profiles: PROFILES,
  };

  return <ProfileCtx.Provider value={value}>{children}</ProfileCtx.Provider>;
}