import { Injectable } from '@angular/core';
import { Transaction } from '../../models/transaction.model';
import { LocalStorageServiceService } from '../local-storages/local-storage-service.service';

@Injectable({
    providedIn: 'root',
})
export class TransactionService {
    private transactions: Transaction[] = [];

    constructor(private storageService: LocalStorageServiceService) {
        const dataFromStorage = this.storageService.getTransactions();
        this.transactions = dataFromStorage.map((tx) => {
            tx.dateTime = new Date(tx.dateTime);
            return tx;
        });
    }

    getTransactions(): Transaction[] {
        return this.transactions;
    }

    getTransactionsByClientId(clientId?: string): Transaction[] {
        if (!clientId) {
            return [];
        }
        return this.transactions.filter((t) => t.clientId === clientId);
    }

    addTransaction(newTransaction: Transaction): void {
        this.transactions.push(newTransaction);

        this.storageService.addTransaction(newTransaction);
    }

    getMonthlyDeposits(clientId: string): number {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const transactions = this.getTransactionsByClientId(clientId);

        const monthlyDeposits = transactions.filter((t) => {
            const transactionDate = new Date(t.dateTime);
            return (
                t.operation === 'Deposito' &&
                transactionDate.getMonth() === currentMonth &&
                transactionDate.getFullYear() === currentYear
            );
        });

        return monthlyDeposits.reduce((sum, t) => sum + t.amount, 0);
    }
}
