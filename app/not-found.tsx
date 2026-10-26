import Link from "next/link";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <EmptyState
      className="mt-10"
      icon={<Compass className="h-6 w-6" />}
      title="Página não encontrada"
      description="O endereço que você tentou abrir não existe no IronLog."
      action={
        <Link href="/" className="text-sm font-medium text-accent hover:underline">
          Voltar ao início
        </Link>
      }
    />
  );
}
