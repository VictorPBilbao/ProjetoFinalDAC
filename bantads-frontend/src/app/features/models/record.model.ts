import { Transaction } from './transaction.model';

export interface Record {
  date: Date;
  consolidatedBalance: number; // Saldo consolidado da conta no dia
  transactions: Transaction[]; // Transações realizadas
}
