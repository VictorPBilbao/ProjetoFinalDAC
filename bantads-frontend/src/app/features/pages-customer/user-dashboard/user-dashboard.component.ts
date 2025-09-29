import { Component, OnDestroy, OnInit } from '@angular/core';
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

    constructor(
        private clientService: ClientService,
        private transactionService: TransactionService
    ) { }

    ngOnInit(): void {
        this.user = this.clientService.getLoggedClient() || null;
        this.balance = this.user?.saldo ?? 0;

        this.depositsThisMonth = this.transactionService.getMonthlyDeposits();
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
    }
}
