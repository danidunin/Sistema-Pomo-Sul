import { NovaMaquinaForm } from "@/components/maquinas/nova-maquina-form";

export default function NovaMaquinaPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900">Nova máquina</h1>
      <NovaMaquinaForm />
    </div>
  );
}
