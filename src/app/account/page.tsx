import type { Metadata } from "next";
import { AccountPage } from "@/components/account/AccountPage";

export const metadata: Metadata = {
  title: "Storage and account",
  description: "Your saved clubs, uploaded images and account settings.",
  robots: { index: false },
};

export default function Page() {
  return <AccountPage />;
}
