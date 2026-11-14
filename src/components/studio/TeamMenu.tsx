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
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button, Dialog, MenuButton, Select } from "@/components/ui/controls";
import { SOURCE_URL } from "@/lib/brand";
import { downloadBlob } from "@/lib/export";
import { isSnapshot, snapshotOf, useActiveTeam, useStudio, useUi } from "@/lib/store";

type Confirm = "delete" | "reset" | null;

/** Club switcher and club options; lives in the grass header. */
export function TeamMenu() {
  const teams = useStudio((s) => s.teams);
  const team = useActiveTeam();
  const setActiveTeam = useStudio((s) => s.setActiveTeam);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const file = useRef<HTMLInputElement>(null);

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
    toast.success("Backup downloaded", {
      description: "Keep the file somewhere safe. Restore it here on any device.",
    });
  }

  async function restore(f: File | undefined) {
    if (!f) return;
    try {
      const data: unknown = JSON.parse(await f.text());
      if (!isSnapshot(data)) throw new Error();
      useStudio.getState().replaceAll({
        teams: data.teams,
        activeTeamId: data.activeTeamId,
        design: { ...useStudio.getState().design, ...data.design },
      });
      toast.success("Backup restored", {
        description: `${data.teams.length} ${data.teams.length === 1 ? "team" : "teams"} loaded.`,
      });
    } catch {
      toast.error("That file is not a teamsheet11 backup");
    } finally {
      if (file.current) file.current.value = "";
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <Select
        label="Team"
        hideLabel
        value={team.id}
        items={teams.map((t) => ({ value: t.id, label: t.name || "Untitled team" }))}
        onChange={setActiveTeam}
        className="w-44 min-w-0 sm:w-52"
        triggerClassName="border-chalk/20 bg-chalk/8 text-chalk hover:border-chalk/45 data-popup-open:border-chalk/60"
      />
      <MenuButton
        label="Team options"
        align="start"
        triggerClassName="grid size-10 shrink-0 place-items-center rounded-md text-chalk/75 hover:bg-chalk/10 hover:text-chalk data-popup-open:bg-chalk/10"
        trigger={<DotsThreeIcon size={22} weight="bold" />}
        items={[
          {
            label: "Add a team",
            icon: <PlusIcon size={16} />,
            onSelect: () => useUi.getState().setSetupOpen(true),
          },
          {
            label: `Delete ${team.name || "this team"}`,
            icon: <TrashIcon size={16} />,
            danger: true,
            onSelect: () => setConfirm("delete"),
          },
          "separator",
          { label: "Download backup", icon: <DownloadSimpleIcon size={16} />, onSelect: backup },
          {
            label: "Restore backup",
            icon: <UploadSimpleIcon size={16} />,
            onSelect: () => file.current?.click(),
          },
          "separator",
          {
            label: "Start over",
            icon: <ArrowCounterClockwiseIcon size={16} />,
            danger: true,
            onSelect: () => setConfirm("reset"),
          },
          "separator",
          {
            label: "Source code",
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
        aria-label="Backup file"
        onChange={(e) => void restore(e.target.files?.[0])}
      />

      <Dialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Delete ${team.name || "this team"}?`}
        description="Its squad, line-up and match details are removed from this browser. Download a backup first if you might need them."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Keep team
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const name = team.name;
                useStudio.getState().removeTeam(team.id);
                setConfirm(null);
                toast(`Deleted ${name || "team"}`);
              }}
            >
              Delete team
            </Button>
          </>
        }
      />
      <Dialog
        open={confirm === "reset"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Start over?"
        description="Every team, player and design setting in this browser is replaced with the example club. This cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                useStudio.getState().resetAll();
                setConfirm(null);
                toast("Started over with the example club");
              }}
            >
              Start over
            </Button>
          </>
        }
      />
    </div>
  );
}
