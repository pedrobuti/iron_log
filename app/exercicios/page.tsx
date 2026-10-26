import type { Metadata } from "next";
import { ExerciseLibrary } from "@/components/exercises/ExerciseLibrary";

export const metadata: Metadata = { title: "Exercícios" };

export default function Page() {
  return <ExerciseLibrary />;
}
