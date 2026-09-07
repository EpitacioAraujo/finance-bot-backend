const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/**
 * Busca por descrição, sem acento e sem caixa. Match exato ganha do parcial:
 * "Nu" com "Nu" e "Nu Pj" cadastrados devolve só o exato.
 */
export const matchByDescription = <T extends { description: string }>(
  items: T[],
  text: string,
): T[] => {
  const query = normalize(text);
  if (!query) return [];
  const exact = items.filter((item) => normalize(item.description) === query);
  if (exact.length > 0) return exact;
  return items.filter((item) => normalize(item.description).includes(query));
};
