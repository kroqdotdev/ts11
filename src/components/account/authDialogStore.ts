"use client";

import { create } from "zustand";

/** signin and signup share one form; reset asks for a link; sent is "check your inbox". */
export type AuthMode = "signin" | "signup" | "reset" | "sent";

interface AuthDialogState {
  open: boolean;
  mode: AuthMode;
  /** Kept between modes, so "Forgot your password?" doesn't ask for it twice. */
  email: string;
  show: (mode?: AuthMode) => void;
  set: (patch: Partial<Pick<AuthDialogState, "open" | "mode" | "email">>) => void;
}

/**
 * The one sign-in dialog's state. Lives in its own small module so a page can offer
 * "Sign in" without loading the dialog (and the auth client) until it's used.
 */
export const useAuthDialog = create<AuthDialogState>()((set) => ({
  open: false,
  mode: "signin",
  email: "",
  show: (mode = "signin") => set({ open: true, mode }),
  set: (patch) => set(patch),
}));
