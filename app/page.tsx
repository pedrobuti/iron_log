import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/Dashboard";

export const metadata: Metadata = { title: "Início" };

export default function HomePage() {
  return <Dashboard />;
}
