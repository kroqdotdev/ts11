"use client";

import dynamic from "next/dynamic";
import { StudioSkeleton } from "./StudioSkeleton";

/* Everything in the studio lives in this browser's storage, so it renders on the client only. */
export const StudioLoader = dynamic(() => import("./Studio").then((m) => m.Studio), {
  ssr: false,
  loading: () => <StudioSkeleton />,
});
