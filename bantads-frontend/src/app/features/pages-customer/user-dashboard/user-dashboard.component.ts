import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Cliente } from '../../models/cliente.model';
import { Subscription } from 'rxjs';
import { ClientService } from '../../services/client/client.service';
import { TransactionService } from '../../services/transaction/transaction.service';
import { RouterModule } from '@angular/router';
import { Transaction } from '../../models/transaction.model';

@Component({
    selector: 'app-user-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './user-dashboard.component.html',
    styleUrls: ['./user-dashboard.component.css'],
})
export class UserDashboardComponent implements OnInit, OnDestroy {
    user: Cliente | null = null;
    balance: number = 0;
    depositsThisMonth: number = 0;
    recentActivity!: Transaction[];

    private sub?: Subscription;

    hideBalance = false;

    constructor(
        private clientService: ClientService,
        private transactionService: TransactionService
    ) {}

    ngOnInit(): void {
        this.user = this.clientService.getLoggedClient() || null;
        this.balance = this.user?.saldo ?? 0;

        this.depositsThisMonth = this.transactionService.getMonthlyDeposits(
            this.user?.id || ''
        );

        // Pega as transações dos ultimos 7 dias
        const recentActivity =
            this.transactionService.getTransactionsByClientId(this.user?.id);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        this.recentActivity = recentActivity.filter((transaction) => {
            const transactionDate = new Date(transaction.dateTime);
            return transactionDate >= sevenDaysAgo;
        });
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
    }

    toggleBalanceVisibility(): void {
        this.hideBalance = !this.hideBalance;
    }
}
