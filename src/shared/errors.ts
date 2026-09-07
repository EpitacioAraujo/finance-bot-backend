/** Erros de domínio. O filter HTTP e o ActionRunner traduzem cada um deles. */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Input malformado ou regra de preenchimento violada. */
export class ValidationError extends DomainError {}

/** Id ou referência que não existe no escopo do usuário. */
export class NotFoundError extends DomainError {}

/** Operação inválida para o estado atual (pagar parcela já paga). */
export class ConflictError extends DomainError {}

/**
 * Busca por texto casou com mais de um registro. Carrega os candidatos: é o
 * que faz o agente perguntar "Nu Pj ou Nu PF?" em vez de escolher sozinho.
 */
export class AmbiguousError extends DomainError {
  constructor(
    message: string,
    readonly candidates: { id: string; description: string }[],
  ) {
    super(message);
  }
}
