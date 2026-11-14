"use client";

import { useTranslations } from "next-intl";
import type { FileWords } from "@/lib/export";
import type { Issue } from "@/lib/issues";
import type { FormatId, GraphicKind } from "@/lib/types";

/** Turns an issue from lib/issues into words in the interface language. */
export function useIssueText() {
  const t = useTranslations("studio.issues");
  return (issue: Issue): string => {
    const values = { ...issue.values };
    if (values.name === "") values.name = t("somePlayer");
    return t(issue.code, values);
  };
}

/** A stable React key for an issue in a list. */
export function issueKey(issue: Issue, index: number): string {
  return `${issue.code}-${issue.field ?? ""}-${index}`;
}

/** File-name words in the interface language, and the graphic's and size's names. */
export function useFileWords() {
  const t = useTranslations("studio");
  const words: FileWords = {
    versus: t("files.versus"),
    and: t("files.and"),
    club: t("files.club"),
    opponent: t("files.opponent"),
  };
  return {
    words,
    /** What `graphicFilename` needs to name one graphic. */
    graphic: (kind: GraphicKind, format: FormatId) => ({
      fixtures: kind === "fixtures",
      kind: t(`kinds.${kind}.label`),
      format: t(`formats.${format}`),
    }),
    kindLabel: (kind: GraphicKind) => t(`kinds.${kind}.label`),
    formatLabel: (format: FormatId) => t(`formats.${format}`),
    zipName: (match: string, size: string) => t("files.zip", { match, size }),
    allSizes: t("files.allSizes"),
    notIncluded: t("files.notIncluded"),
    notIncludedTitle: t("files.notIncludedTitle"),
  };
}

export type FileNaming = ReturnType<typeof useFileWords>;
