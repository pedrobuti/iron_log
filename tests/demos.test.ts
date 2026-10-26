import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_EXERCISES } from "@/data/exercises";
import { DEMOS_BY_ID, EXERCISE_DEMOS, getDemo } from "@/data/exercise-demos";
import { mergeDefaultExercises } from "@/lib/storage/repository";

describe("exemplos visuais (free-exercise-db)", () => {
  it("todo exercício padrão aponta para um exemplo existente", () => {
    for (const e of DEFAULT_EXERCISES) {
      expect(e.demoId, `${e.id} sem demoId`).toBeTruthy();
      expect(DEMOS_BY_ID.has(e.demoId as string), `${e.id} → ${e.demoId} não está no catálogo`).toBe(true);
    }
  });

  it("todas as imagens referenciadas existem em public/", () => {
    for (const d of EXERCISE_DEMOS) {
      for (const img of d.images) {
        const file = path.join(process.cwd(), "public", img);
        expect(existsSync(file), `faltando ${img}`).toBe(true);
      }
      expect(d.steps.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("ids do catálogo são únicos", () => {
    expect(new Set(EXERCISE_DEMOS.map((d) => d.id)).size).toBe(EXERCISE_DEMOS.length);
  });

  it("getDemo lida com ausência", () => {
    expect(getDemo(undefined)).toBeUndefined();
    expect(getDemo("nao-existe")).toBeUndefined();
    expect(getDemo("Plank")?.name).toBe("Prancha abdominal");
  });

  it("dados antigos sem demoId recebem o exemplo padrão sem perder personalizações", () => {
    const stored = DEFAULT_EXERCISES.slice(0, 3).map((e) => {
      const copy = { ...e, technique: "minha nota" };
      delete copy.demoId;
      return copy;
    });
    const merged = mergeDefaultExercises(stored);
    expect(merged[0]?.demoId).toBe(DEFAULT_EXERCISES[0]?.demoId);
    expect(merged[0]?.technique).toBe("minha nota");
    expect(merged.length).toBe(DEFAULT_EXERCISES.length);
  });
});
