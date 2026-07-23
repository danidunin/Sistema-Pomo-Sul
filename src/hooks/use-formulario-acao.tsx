"use client";

import { useActionState } from "react";

type AcaoFormulario = (
  prevState: string | undefined,
  formData: FormData,
) => Promise<string | undefined>;

/**
 * Consolida o padrão repetido em todos os formulários de ação única: useActionState +
 * mensagem de erro (`role="alert"`) + rótulo do botão trocando durante o pending.
 */
export function useFormularioAcao(action: AcaoFormulario) {
  const [errorMessage, formAction, isPending] = useActionState(action, undefined);

  const erro = errorMessage ? (
    <p className="text-sm text-red-600" role="alert">
      {errorMessage}
    </p>
  ) : null;

  function rotulo(label: string, labelPendente = "Salvando...") {
    return isPending ? labelPendente : label;
  }

  return { formAction, errorMessage, isPending, erro, rotulo };
}
