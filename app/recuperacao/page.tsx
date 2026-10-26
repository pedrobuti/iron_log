import type { Metadata } from "next";
import { RecoveryPage } from "@/components/recovery/RecoveryPage";

export const metadata: Metadata = { title: "Recuperação" };

export default function Page() {
  return <RecoveryPage />;
}
