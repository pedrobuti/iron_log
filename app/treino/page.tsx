import type { Metadata } from "next";
import { LiveWorkout } from "@/components/workout/LiveWorkout";

export const metadata: Metadata = { title: "Treino" };

export default function Page() {
  return <LiveWorkout />;
}
