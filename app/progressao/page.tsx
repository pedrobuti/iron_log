import type { Metadata } from "next";
import { ProgressionPage } from "@/components/progression/ProgressionPage";

export const metadata: Metadata = { title: "Progressão" };

export default function Page() {
  return <ProgressionPage />;
}
