/** Confirma que um valor bruto (ex: vindo de FormData) é de fato um membro do enum, antes de usá-lo num `as`. */
export function ehValorDoEnum<T extends Record<string, string>>(
  enumObj: T,
  valor: string,
): valor is T[keyof T] {
  return (Object.values(enumObj) as string[]).includes(valor);
}
