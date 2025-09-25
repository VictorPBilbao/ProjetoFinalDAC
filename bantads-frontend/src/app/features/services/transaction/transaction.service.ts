import { Injectable } from '@angular/core';
import { Transaction } from '../models/transaction.model';

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

  addTransaction(newTransaction: Transaction): void {
    this.transactions.push(newTransaction);
    this.persist();
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
        dateTime: new Date('2025-08-01T10:00:00'),
        operation: 'Deposito',
        amount: 1500,
      },
      {
        dateTime: new Date('2025-08-01T14:30:00'),
        operation: 'Saque',
        amount: -50,
      },
      {
        dateTime: new Date('2025-08-03T11:20:00'),
        operation: 'Transferencia',
        fromOrToClient: 'Fausto Silva',
        amount: -300,
      },
      {
        dateTime: new Date('2025-08-05T09:00:00'),
        operation: 'Saque',
        amount: -100,
      },
      {
        dateTime: new Date('2025-08-05T16:45:00'),
        operation: 'Transferencia',
        fromOrToClient: 'Geraldo Alckmin',
        amount: 850,
      },
      {
        dateTime: new Date('2025-08-08T12:00:00'),
        operation: 'Deposito',
        amount: 200,
      },
      {
        dateTime: new Date('2025-08-10T18:00:00'),
        operation: 'Saque',
        amount: -200,
      },
    ];
    localStorage.setItem(this.LS_CHAVE, JSON.stringify(initialTransactions));
  }
}
