import type { Metadata } from "next";
import { WeekPlanner } from "@/components/week/WeekPlanner";

export const metadata: Metadata = { title: "Minha semana" };

export default function Page() {
  return <WeekPlanner />;
}
