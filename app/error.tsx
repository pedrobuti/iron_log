"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto mt-10 max-w-md p-6 text-center">
      <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-danger" />
      <h1 className="text-lg font-semibold">Algo deu errado</h1>
      <p className="mt-2 text-sm text-muted">{error.message || "Erro inesperado ao renderizar esta página."}</p>
      <p className="mt-1 text-xs text-muted">Seus dados salvos não foram afetados.</p>
      <Button className="mt-4" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  );
}
