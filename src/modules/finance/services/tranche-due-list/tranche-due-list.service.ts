import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Repository } from 'typeorm';
import { TransactionTrancheEntity } from '@/modules/finance/entities/transaction-tranche.entity';
import { TransactionType } from '@/modules/finance/entities/transaction.entity';

export interface TrancheDueView {
  id: string;
  transactionId: string;
  /** Preenchido quando a compra é o pagamento de uma conta. */
  billId: string | null;
  description: string;
  /** Valor da tranche, não da compra. */
  amount: number;
  type: TransactionType;
  purchaseDate: string;
  /** '1/10'; nulo quando a compra tem uma tranche só. */
  tranche: string | null;
  paymentMethod: { id: string; description: string };
  /** Só crédito: a fatura em que a tranche caiu. */
  cycleId: string | null;
  paidAt: Date | null;
}

/**
 * O mês aqui é o ciclo que **abre** nele: com fechamento no dia 7, setembro é
 * 07/09 a 06/10. Cada cartão tem a sua janela, então o filtro vai no
 * `startDate` do ciclo. Sem ciclo (pix, débito…), vale o vencimento da tranche.
 */
@Injectable()
export class TrancheDueListService {
  constructor(
    @InjectRepository(TransactionTrancheEntity)
    private readonly tranches: Repository<TransactionTrancheEntity>,
  ) {}

  async exec({
    userId,
    from,
    to,
  }: {
    userId: string;
    from: string;
    to: string;
  }): Promise<TrancheDueView[]> {
    const window = Between(from, to);
    const transaction = { userId };

    const items = await this.tranches.find({
      // Lista de `where` é OR no TypeORM.
      where: [
        { cycle: { startDate: window }, transaction },
        { cycleId: IsNull(), dueDate: window, transaction },
      ],
      // As tranches irmãs vêm junto só para dizer o "de quantas" do 1/10.
      relations: { transaction: { paymentMethod: true, tranches: true } },
    });

    return items.map((item) => {
      // Carregada pelas `relations` acima.
      const t = item.transaction!;
      const count = t.tranches!.length;
      return {
        id: item.id,
        transactionId: t.id,
        billId: t.billId,
        description: t.description,
        amount: item.amount,
        type: t.type,
        purchaseDate: t.date,
        tranche: count > 1 ? `${item.number}/${count}` : null,
        paymentMethod: { id: t.paymentMethodId, description: t.paymentMethod!.description },
        cycleId: item.cycleId,
        paidAt: item.paidAt,
      };
    });
  }
}
