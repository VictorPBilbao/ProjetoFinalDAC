import { Injectable } from '@angular/core';
import { Transaction } from '../../models/transaction.model';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private readonly LS_CHAVE = 'transactionData';
  private transactions: Transaction[] = [];

  constructor() {
    this.initializeData();
  }

  getTransactions(): Transaction[] {
    return this.transactions;
  }

  /** Retorna uma transação pelo id ou undefined se não existir */
  getTransaction(id: string): Transaction | undefined {
    return this.transactions.find((t) => t.id === id);
  }

  addTransaction(newTransaction: Transaction): void {
    this.transactions.push(newTransaction);
    this.persist();
  }

  /** Atualiza uma transação existente. Retorna true se atualizada, false se não encontrada. */
  updateTransaction(updatedTransaction: Transaction): boolean {
    const idx = this.transactions.findIndex((t) => t.id === updatedTransaction.id);
    if (idx === -1) return false;
    // preserva objeto novo (imutabilidade leve)
    this.transactions[idx] = { ...updatedTransaction };
    this.persist();
    return true;
  }

  /** Remove uma transação pelo id. Retorna true se removida, false se não encontrada. */
  deleteTransaction(id: string): boolean {
    const originalLength = this.transactions.length;
    this.transactions = this.transactions.filter((t) => t.id !== id);
    const removed = this.transactions.length !== originalLength;
    if (removed) this.persist();
    return removed;
  }

  private persist(): void {
    localStorage.setItem(this.LS_CHAVE, JSON.stringify(this.transactions));
  }

  private initializeData() {
    if (!localStorage.getItem(this.LS_CHAVE)) {
      this.seedInitialData();
    }
    this.transactions = this.loadFromLS();
  }

  private loadFromLS(): Transaction[] {
    const dataJson = localStorage.getItem(this.LS_CHAVE);
    if (!dataJson) return [];

    const data: Transaction[] = JSON.parse(dataJson);
    return data.map((tx) => {
      tx.dateTime = new Date(tx.dateTime);
      return tx;
    });
  }

  private seedInitialData(): void {
    const initialTransactions: Transaction[] = [
      {
        id: '1',
        dateTime: new Date('2025-08-01T10:00:00'),
        operation: 'Deposito',
        amount: 1500,
      },
      {
        id: '2',
        dateTime: new Date('2025-08-01T14:30:00'),
        operation: 'Saque',
        amount: -50,
      },
      {
        id: '3',
        dateTime: new Date('2025-08-03T11:20:00'),
        operation: 'Transferencia',
        fromOrToClient: 'Fausto Silva',
        amount: -300,
      },
      {
        id: '4',
        dateTime: new Date('2025-08-05T09:00:00'),
        operation: 'Saque',
        amount: -100,
      },
      {
        id: '5',
        dateTime: new Date('2025-08-05T16:45:00'),
        operation: 'Transferencia',
        fromOrToClient: 'Geraldo Alckmin',
        amount: 850,
      },
      {
        id: '6',
        dateTime: new Date('2025-08-08T12:00:00'),
        operation: 'Deposito',
        amount: 200,
      },
      {
        id: '7',
        dateTime: new Date('2025-08-10T18:00:00'),
        operation: 'Saque',
        amount: -200,
      },
    ];
    localStorage.setItem(this.LS_CHAVE, JSON.stringify(initialTransactions));
  }
}
