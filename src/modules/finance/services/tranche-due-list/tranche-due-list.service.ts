import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Repository } from 'typeorm';
import { TransactionTrancheEntity } from '@/modules/finance/entities/transaction-tranche.entity';
import { TransactionType } from '@/modules/finance/entities/transaction.entity';

export interface TrancheDueListInput {
  userId: string;
  from: string;
  to: string;
  type?: TransactionType;
  tagId?: string;
  paymentMethodId?: string;
  limit?: number;
  offset?: number;
}

export interface TrancheDueView {
  /** Id da tranche — chave de linha. As ações são da compra, por `transactionId`. */
  id: string;
  transactionId: string;
  description: string;
  /** Valor da tranche, não da compra. */
  amount: number;
  type: TransactionType;
  dueDate: string;
  /** Quando foi comprado — o que a outra leitura usa como eixo. */
  purchaseDate: string;
  /** '1/10'; nulo quando a compra tem uma tranche só. */
  tranche: string | null;
  /** Quantas tranches a compra tem — o que some junto se ela for removida. */
  installments: number;
  paymentMethod: { id: string; description: string };
  /** Só crédito: a fatura em que a tranche caiu, com a janela de compras dela. */
  cycle: {
    id: string;
    referenceMonth: string;
    startDate: string;
    endDate: string;
  } | null;
  paidAt: Date | null;
}

export interface TrancheDueListResult {
  items: TrancheDueView[];
  total: number;
}

/**
 * O mês aqui é o ciclo que **abre** nele, não o mês civil: com fechamento no dia
 * 7, setembro é de 08/09 a 07/10 — e essa fatura só vence em 15/10. Cada cartão
 * tem a sua janela, então o filtro vai no `startDate` do ciclo, não numa data
 * única. Forma de pagamento sem ciclo (pix, dinheiro, débito) não tem janela
 * para seguir e cai no mês civil, pelo vencimento da própria tranche.
 */
@Injectable()
export class TrancheDueListService {
  constructor(
    @InjectRepository(TransactionTrancheEntity)
    private readonly tranches: Repository<TransactionTrancheEntity>,
  ) {}

  async exec(input: TrancheDueListInput): Promise<TrancheDueListResult> {
    // Os filtros da compra valem nos dois ramos do OR; a janela é o que muda.
    const transaction = {
      userId: input.userId,
      ...(input.type ? { type: input.type } : {}),
      ...(input.paymentMethodId
        ? { paymentMethodId: input.paymentMethodId }
        : {}),
      ...(input.tagId ? { tags: { id: input.tagId } } : {}),
    };
    const window = Between(input.from, input.to);

    const [items, total] = await this.tranches.findAndCount({
      // Lista de `where` é OR no TypeORM.
      where: [
        { cycle: { startDate: window }, transaction },
        { cycleId: IsNull(), dueDate: window, transaction },
      ],
      // As tranches irmãs vêm junto só para dizer o "de quantas" do 1/10.
      relations: {
        cycle: true,
        transaction: { paymentMethod: true, tranches: true },
      },
      // Só colunas da própria tranche: ordenar por coluna da relação quebra a
      // paginação, que o TypeORM resolve com subquery DISTINCT.
      order: { dueDate: 'ASC', id: 'ASC' },
      take: input.limit ?? 100,
      skip: input.offset ?? 0,
    });

    return {
      items: items.map((item) => {
        const count = item.transaction?.tranches?.length ?? 1;
        return {
          id: item.id,
          transactionId: item.transactionId,
          description: item.transaction?.description ?? '',
          amount: item.amount,
          type: item.transaction?.type as TransactionType,
          dueDate: item.dueDate,
          purchaseDate: item.transaction?.date ?? item.dueDate,
          tranche: count > 1 ? `${item.number}/${count}` : null,
          installments: count,
          paymentMethod: {
            id: item.transaction?.paymentMethodId ?? '',
            description: item.transaction?.paymentMethod?.description ?? '',
          },
          cycle: item.cycle
            ? {
                id: item.cycle.id,
                referenceMonth: item.cycle.referenceMonth,
                startDate: item.cycle.startDate,
                endDate: item.cycle.endDate,
              }
            : null,
          paidAt: item.paidAt,
        };
      }),
      total,
    };
  }
}
