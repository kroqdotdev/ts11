"use client";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import {
  BroomIcon,
  CaretDownIcon,
  HardDrivesIcon,
  SignOutIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { signOutSafely } from "@/lib/sync/signout";
import { useAuthDialog } from "./AuthDialog";

const item =
  "flex cursor-default items-center gap-2.5 rounded-[2px] px-2.5 py-2 text-sm outline-none select-none data-highlighted:bg-card data-highlighted:text-card-ink";

/**
 * The studio's account entry. Signed out it opens the sign-in dialog; signed in
 * it's a menu with the address, the storage page and sign out.
 */
export function AccountButton({ className }: { className?: string }) {
  const { data, isPending } = useSession();
  const show = useAuthDialog((s) => s.show);
  const router = useRouter();

  if (isPending) {
    return <span aria-hidden className={clsx("h-9 w-20 rounded-[4px] bg-chalk/10", className)} />;
  }

  if (!data?.user) {
    return (
      <button
        type="button"
        onClick={() => show("signin")}
        className={clsx(
          "inline-flex h-9 items-center gap-2 rounded-[4px] border-2 border-chalk/30 px-3 text-sm font-semibold text-chalk transition-colors hover:border-chalk/70 hover:bg-chalk/10",
          className,
        )}
      >
        <UserCircleIcon size={18} weight="bold" />
        Sign in
      </button>
    );
  }

  const email = data.user.email;
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger
        aria-label={`Account: ${email}`}
        className={clsx(
          "inline-flex h-9 max-w-52 items-center gap-2 rounded-[4px] border-2 border-chalk/30 px-2.5 text-sm font-semibold text-chalk transition-colors hover:border-chalk/70 hover:bg-chalk/10 data-popup-open:border-chalk data-popup-open:bg-chalk/10",
          className,
        )}
      >
        <span
          aria-hidden
          className="grid size-6 shrink-0 place-items-center border-2 border-card-ink bg-card text-[13px] leading-none font-bold text-card-ink uppercase"
        >
          {email.slice(0, 1)}
        </span>
        <span className="hidden truncate sm:inline">{email}</span>
        <CaretDownIcon size={14} weight="bold" className="shrink-0" />
      </BaseMenu.Trigger>
      <BaseMenu.Portal>
        <BaseMenu.Positioner sideOffset={8} align="end" className="z-50 outline-none">
          <BaseMenu.Popup className="w-64 origin-(--transform-origin) rounded-[4px] border-2 border-edge bg-paper p-1 text-ink shadow-[5px_5px_0_var(--edge)] transition-[scale,opacity] duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <div className="px-2.5 pt-2 pb-2.5">
              <p className="text-xs text-ink-soft">Signed in as</p>
              <p className="truncate text-sm font-semibold">{email}</p>
              {!data.user.emailVerified && (
                <p className="mt-1 text-xs font-medium text-danger">Email not confirmed yet</p>
              )}
            </div>
            <BaseMenu.Separator className="mx-1 mb-1 h-0.5 bg-rule" />
            <BaseMenu.Item className={item} onClick={() => router.push("/account")}>
              <HardDrivesIcon size={18} weight="bold" />
              Storage and account
            </BaseMenu.Item>
            <BaseMenu.Item
              className={item}
              onClick={async () => {
                const { ok } = await signOutSafely();
                if (ok) toast("Signed out. Your clubs are still in this browser.");
                else toast.error("Couldn't sign out. Try again.");
              }}
            >
              <SignOutIcon size={18} weight="bold" />
              Sign out
            </BaseMenu.Item>
            <BaseMenu.Item
              className={item}
              onClick={async () => {
                const { ok } = await signOutSafely({ clear: true });
                if (ok) toast("Signed out and cleared. Your clubs are safe in your account.");
                else toast.error("Couldn't sign out. Try again.");
              }}
            >
              <BroomIcon size={18} weight="bold" />
              Sign out and clear this browser
            </BaseMenu.Item>
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}
