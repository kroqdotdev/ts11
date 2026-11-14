"use client";

import { Menu } from "@base-ui/react/menu";
import {
  BroomIcon,
  CaretDownIcon,
  HardDrivesIcon,
  SignInIcon,
  SignOutIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { signOutSafely } from "@/lib/sync/signout";
import { useSyncState } from "@/lib/sync/state";
import { useAuthDialog } from "./authDialogStore";
import { EmailText } from "./EmailText";

/** The first letter of the name or address, on a small yellow card. */
export function Avatar({ text }: { text: string }) {
  return (
    <span
      aria-hidden
      className="grid size-6 shrink-0 place-items-center rounded-[2px] border-2 border-card-ink bg-card font-signage text-[17px] leading-none text-card-ink"
    >
      {(text.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}

/** Signs out after saving what's pending; with `clear`, also empties this browser. */
export async function signOutWithToast(clear: boolean) {
  const { ok } = await signOutSafely({ clear });
  if (!ok) {
    toast.error("Couldn't sign out. Check your connection and try again.");
    return false;
  }
  toast("Signed out", {
    description: clear
      ? "This browser is cleared. Your clubs are in your account."
      : "Your clubs are still in this browser.",
  });
  return true;
}

/**
 * The studio header's account entry: a quiet "Sign in" while signed out, and the
 * account menu once signed in.
 */
export function AccountButton() {
  const { data, isPending } = useSession();
  const show = useAuthDialog((s) => s.show);
  const router = useRouter();
  const user = data?.user;

  if (isPending && !user) return null;
  if (!user) {
    return (
      <button
        type="button"
        onClick={() => show("signin")}
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[3px] border-2 border-chalk/25 px-3 text-sm font-medium text-chalk transition-colors hover:border-chalk/60 hover:bg-chalk/8"
      >
        <SignInIcon size={16} weight="bold" aria-hidden />
        Sign in
      </button>
    );
  }

  const clearBrowser = () => {
    // Only clear once everything is in the account; otherwise this browser holds the
    // only copy of the latest changes.
    if (useSyncState.getState().status !== "saved") {
      toast("Not everything is saved yet", {
        description: "This browser keeps its clubs for now. Try again once the header says Saved.",
      });
      return;
    }
    void signOutWithToast(true);
  };

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Account menu, signed in as ${user.email}`}
        className="inline-flex h-10 max-w-64 min-w-0 shrink items-center gap-2 rounded-[3px] border-2 border-chalk/20 bg-chalk/8 pr-2 pl-1.5 text-sm text-chalk transition-colors hover:border-chalk/45 data-popup-open:border-chalk/60"
      >
        <Avatar text={user.name || user.email} />
        <span className="hidden min-w-0 truncate md:block">{user.email}</span>
        <CaretDownIcon size={14} weight="bold" aria-hidden className="shrink-0 opacity-75" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" className="z-50 outline-none">
          <Menu.Popup className="w-[min(18rem,calc(100vw-1.5rem))] origin-(--transform-origin) rounded-[4px] border-2 border-edge bg-paper p-1 text-ink shadow-[5px_5px_0_var(--edge)] transition-[scale,opacity] duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <Menu.Group>
              <Menu.GroupLabel className="px-2.5 pt-2 text-xs text-ink-soft">
                Signed in as
              </Menu.GroupLabel>
              <p className="px-2.5 pb-2 text-sm font-semibold">
                <EmailText email={user.email} />
              </p>
            </Menu.Group>
            <Menu.Separator className="mx-1 my-1 h-0.5 bg-rule" />
            <Item icon={<HardDrivesIcon size={16} />} onClick={() => router.push("/account")}>
              Storage and account
            </Item>
            <Item icon={<SignOutIcon size={16} />} onClick={() => void signOutWithToast(false)}>
              Sign out
            </Item>
            {user.emailVerified && (
              <Item icon={<BroomIcon size={16} />} onClick={clearBrowser}>
                Sign out and clear this browser
              </Item>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function Item({
  icon,
  onClick,
  children,
}: {
  icon: ReactNode;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Menu.Item
      onClick={onClick}
      className="flex cursor-default items-center gap-2.5 rounded-[2px] px-2.5 py-2 text-sm outline-none select-none data-highlighted:bg-card data-highlighted:text-card-ink"
    >
      <span aria-hidden className="shrink-0">
        {icon}
      </span>
      {children}
    </Menu.Item>
  );
}
