"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PlanilhaUploadForm() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setEnviando(true);
    setErro(null);

    try {
      const formData = new FormData();
      formData.append("file", arquivo);
      const res = await fetch("/api/upload/planilha-pragas", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Falha no envio.");
      router.refresh();
    } catch (err) {
      console.error("Falha ao enviar planilha:", err);
      setErro(err instanceof Error && err.message ? err.message : "Não foi possível enviar a planilha. Tente novamente.");
    } finally {
      setEnviando(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <label
        htmlFor="planilha-upload"
        className="inline-block cursor-pointer rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white active:bg-green-800"
      >
        {enviando ? "Enviando..." : "Enviar planilha"}
      </label>
      <input
        id="planilha-upload"
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={handleChange}
        disabled={enviando}
        className="hidden"
      />
      {erro && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
