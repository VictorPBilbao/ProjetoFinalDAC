import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Cliente } from '../../models/cliente.model';
import { Subscription } from 'rxjs';
import { ClientService } from '../../services/client/client.service';
import { TransactionService } from '../../services/transaction/transaction.service';
import { RouterModule } from '@angular/router';

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

    private sub?: Subscription;

    hideBalance = false;

    @HostBinding('class.dark') darkMode = false;

    constructor(
        private clientService: ClientService,
        private transactionService: TransactionService
    ) { }

    ngOnInit(): void {
        this.user = this.clientService.getLoggedClient() || null;
        this.balance = this.user?.saldo ?? 0;

        this.depositsThisMonth = this.transactionService.getMonthlyDeposits(this.user?.id || '');

        // opcional: ler preferência salva
        const saved = localStorage.getItem('dashboardDarkMode');
        if (saved !== null) this.darkMode = saved === 'true';
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
    }

    toggleBalanceVisibility(): void {
        this.hideBalance = !this.hideBalance;
    }

    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        // opcional: salvar preferência no localStorage
        localStorage.setItem('dashboardDarkMode', String(this.darkMode));
    }
}
