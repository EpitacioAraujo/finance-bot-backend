/**
 * O driver do Postgres devolve `decimal` como string. A conversão para number
 * acontece aqui, uma vez, na borda da entidade — nunca espalhada pelos services.
 */
export const decimalTransformer = {
  to: (value: number | null): number | null => value,
  from: (value: string | null): number | null =>
    value === null ? null : Number(value),
};
