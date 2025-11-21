import { Subscription } from 'rxjs';

import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { Cliente } from '../../models/cliente.model';
import { ClientService } from '../../services/client/client.service';
import { ServiceContaService } from '../../services/conta/service-conta.service';
import { Component, HostBinding, OnInit } from '@angular/core';
import { Transaction } from '../../models/transaction.model';

@Component({
    selector: 'app-user-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './user-dashboard.component.html',
    styleUrls: ['./user-dashboard.component.css'],
})
export class UserDashboardComponent implements OnInit {
    user: Cliente | null = null;
    balance: number = 0;
    depositsThisMonth: number = 0;
    recentActivity: Transaction[] = [];

    private sub?: Subscription;

    hideBalance = false;

    @HostBinding('class.dark') darkMode = false;

    constructor(
        private clientService: ClientService,
        private contaService: ServiceContaService
    ) {}

    ngOnInit(): void {
        this.darkMode = localStorage.getItem('dashboardDarkMode') === 'true';

        this.sub = this.clientService.getLoggedClient().subscribe({
            next: (client) => {
                this.user = client ?? null;

                this.balance = this.user?.saldo ?? 0;

                if (this.user && this.user.conta) {
                    const numeroConta =
                        typeof this.user.conta === 'object'
                            ? (this.user.conta as any).numero
                            : this.user.conta;

                    if (numeroConta) {
                        this.loadRealTransactions(numeroConta);
                    }
                }
            },
            error: (err) =>
                console.error('Erro ao carregar dados do cliente:', err),
        });
    }

    loadRealTransactions(numeroConta: string) {
        this.contaService
            .getStatement(numeroConta)
            .subscribe((records: any[]) => {
                const transactions: Transaction[] = records.map((r) => ({
                    id: r.id || Math.random().toString(36).substr(2, 9),
                    dateTime: new Date(r.dataHora || r.data),
                    operation: this.formatOperationName(r.tipo),
                    amount: r.valor,
                    clientId: this.user?.id ?? '',
                }));

                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                sevenDaysAgo.setHours(0, 0, 0, 0);

                this.recentActivity = transactions
                    .filter((t) => t.dateTime >= sevenDaysAgo)
                    .sort(
                        (a, b) => b.dateTime.getTime() - a.dateTime.getTime()
                    );

                const now = new Date();
                const firstDayOfMonth = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    1
                );

                this.depositsThisMonth = transactions
                    .filter(
                        (t) =>
                            String(t.operation).toUpperCase() === 'DEPOSITO' &&
                            t.dateTime >= firstDayOfMonth
                    )
                    .reduce((sum, t) => sum + t.amount, 0);
            });
    }

    private formatOperationName(
        tipo: string
    ): 'Transferencia' | 'Deposito' | 'Saque' {
        const map: { [key: string]: 'Transferencia' | 'Deposito' | 'Saque' } = {
            DEPOSITO: 'Deposito',
            SAQUE: 'Saque',
            TRANSFERENCIA_ORIGEM: 'Transferencia',
            TRANSFERENCIA_DESTINO: 'Transferencia',
        };
        return map[tipo] || 'Transferencia';
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
    }

    toggleBalanceVisibility(): void {
        this.hideBalance = !this.hideBalance;
    }

    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        localStorage.setItem('dashboardDarkMode', String(this.darkMode));
    }
}
