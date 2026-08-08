import { create } from "zustand";
import type { UserSummary } from "../api/client";

interface UserState {
  currentUser: UserSummary | null;
  login: (user: UserSummary) => void;
  logout: () => void;
}

const STORAGE_KEY = "ajaia_user";

function loadStoredUser(): UserSummary | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserSummary) : null;
  } catch {
    return null;
  }
}

export const useUserStore = create<UserState>((set) => ({
  currentUser: loadStoredUser(),
  login: (user) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem("ajaia_user_id", user.id);
    set({ currentUser: user });
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("ajaia_user_id");
    set({ currentUser: null });
  },
}));
