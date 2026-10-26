import type { Metadata } from "next";
import { SettingsPage } from "@/components/settings/SettingsPage";

export const metadata: Metadata = { title: "Perfil" };

export default function Page() {
  return <SettingsPage />;
}
