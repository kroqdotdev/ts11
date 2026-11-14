"use client";

import {
  ArrowCounterClockwiseIcon,
  DotsThreeIcon,
  DownloadSimpleIcon,
  GithubLogoIcon,
  PlusIcon,
  TrashIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button, Dialog, MenuButton, Select } from "@/components/ui/controls";
import { SOURCE_URL } from "@/lib/brand";
import { downloadBlob } from "@/lib/export";
import { isSnapshot, snapshotOf, useActiveTeam, useStudio, useUi } from "@/lib/store";
import { ownerOfLocalData } from "@/lib/sync/engine";
import { useSyncState } from "@/lib/sync/state";

type Confirm = "delete" | "reset" | null;

/** Club switcher and club options; lives in the grass header. */
export function TeamMenu() {
  const teams = useStudio((s) => s.teams);
  const team = useActiveTeam();
  const setActiveTeam = useStudio((s) => s.setActiveTeam);
  const [confirm, setConfirm] = useState<Confirm>(null);
  // While an account is saving this browser's clubs, starting over would mean deleting
  // them from the account; that's done club by club, or by deleting the account.
  const syncing = useSyncState((s) => s.status !== "off" && s.status !== "unverified");
  const file = useRef<HTMLInputElement>(null);
  const t = useTranslations("studio.team");
  const teamName = team.name.trim() || t("thisTeam");

  function backup() {
    const data = JSON.stringify({
      app: "teamsheet11",
      version: 1,
      ...snapshotOf(useStudio.getState()),
    });
    downloadBlob(
      new Blob([data], { type: "application/json" }),
      `teamsheet11-backup-${new Date().toISOString().slice(0, 10)}.json`,
    );
    toast.success(t("backupDone"), { description: t("backupHint") });
  }

  async function restore(f: File | undefined) {
    if (!f) return;
    try {
      const data: unknown = JSON.parse(await f.text());
      if (!isSnapshot(data)) throw new Error();
      const s = useStudio.getState();
      // Clubs saved to an account stay: the backup's clubs are added or updated, so a
      // restore never deletes anything from the account.
      const keep = ownerOfLocalData() !== null;
      const ids = new Set(data.teams.map((t) => t.id));
      const teams = keep ? [...s.teams.filter((t) => !ids.has(t.id)), ...data.teams] : data.teams;
      s.replaceAll({
        teams,
        activeTeamId: data.activeTeamId,
        design: { ...s.design, ...data.design },
      });
      const count = data.teams.length;
      toast.success(t("restored"), {
        description: keep ? t("restoredAdded", { count }) : t("restoredLoaded", { count }),
      });
    } catch {
      toast.error(t("notBackup"));
    } finally {
      if (file.current) file.current.value = "";
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <Select
        label={t("label")}
        hideLabel
        value={team.id}
        items={teams.map((x) => ({ value: x.id, label: x.name || t("untitled") }))}
        onChange={setActiveTeam}
        className="w-44 min-w-0 sm:w-52"
        triggerClassName="border-chalk/20 bg-chalk/8 text-chalk hover:border-chalk/45 data-popup-open:border-chalk/60"
      />
      <MenuButton
        label={t("options")}
        align="start"
        triggerClassName="grid size-10 shrink-0 place-items-center rounded-md text-chalk/75 hover:bg-chalk/10 hover:text-chalk data-popup-open:bg-chalk/10"
        trigger={<DotsThreeIcon size={22} weight="bold" />}
        items={[
          {
            label: t("add"),
            icon: <PlusIcon size={16} />,
            onSelect: () => useUi.getState().setSetupOpen(true),
          },
          {
            label: t("delete", { name: teamName }),
            icon: <TrashIcon size={16} />,
            danger: true,
            onSelect: () => setConfirm("delete"),
          },
          "separator",
          { label: t("backup"), icon: <DownloadSimpleIcon size={16} />, onSelect: backup },
          {
            label: t("restore"),
            icon: <UploadSimpleIcon size={16} />,
            onSelect: () => file.current?.click(),
          },
          ...(syncing
            ? []
            : [
                "separator" as const,
                {
                  label: t("startOver"),
                  icon: <ArrowCounterClockwiseIcon size={16} />,
                  danger: true,
                  onSelect: () => setConfirm("reset"),
                },
              ]),
          "separator",
          {
            label: t("source"),
            icon: <GithubLogoIcon size={16} />,
            onSelect: () => window.open(SOURCE_URL, "_blank", "noopener,noreferrer"),
          },
        ]}
      />
      <input
        ref={file}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        // Opened from "Restore from backup" in the menu, so it needs no Tab stop of its own.
        tabIndex={-1}
        aria-hidden
        aria-label={t("backupFile")}
        onChange={(e) => void restore(e.target.files?.[0])}
      />

      <Dialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={t("deleteTitle", { name: teamName })}
        description={t("deleteBody")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              {t("keep")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const name = team.name;
                useStudio.getState().removeTeam(team.id);
                setConfirm(null);
                toast(name.trim() ? t("deleted", { name }) : t("deletedNoName"));
              }}
            >
              {t("deleteTeam")}
            </Button>
          </>
        }
      />
      <Dialog
        open={confirm === "reset"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={t("resetTitle")}
        description={t("resetBody")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                useStudio.getState().resetAll();
                setConfirm(null);
                toast(t("resetDone"));
              }}
            >
              {t("startOver")}
            </Button>
          </>
        }
      />
    </div>
  );
}
