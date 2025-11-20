import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { Transaction } from '../../models/transaction.model';
import { Record } from '../../models/record.model';
import { TransactionService } from '../../services/transaction/transaction.service';
import { Cliente } from '../../models/cliente.model';
import { ClientService } from '../../services/client/client.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-statement',
    standalone: true,
    imports: [FormsModule, CommonModule],
    templateUrl: './statement.component.html',
    styleUrl: './statement.component.css',
})
export class StatementComponent implements OnInit, OnDestroy {
    beginDate: string = '';
    endDate: string = '';

    private allTransactions: Transaction[] = [];
    dailyRecords: Record[] = [];
    pgDailyRecords: Record[] = [];

    currentPg: number = 1;
    itmsPerPg: number = 7;
    totalPgs: number = 0;

    cliente: Cliente | null = null;
    private sub?: Subscription;
    isLoading: any;

    constructor(
        private transactionService: TransactionService,
        private clientService: ClientService
    ) {}

    ngOnInit(): void {
        this.sub = this.clientService.getLoggedClient().subscribe((client) => {
            this.cliente = client || null;

            if (this.cliente) {
                this.allTransactions =
                    this.transactionService.getTransactionsByClientId(
                        this.cliente.id
                    );
            } else {
                this.allTransactions = [];
            }
        });
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
    }

    getStatement() {
        if (!this.beginDate || !this.endDate) {
            Swal.fire({
                icon: 'warning',
                title: 'Atenção',
                text: 'Por favor, preencha as datas de início e fim.',
                confirmButtonColor: '#0ec093',
            });
            return;
        }
        const beginDateFilter = new Date(this.beginDate + 'T00:00:00');
        const endDateFilter = new Date(this.endDate + 'T23:59:59');

        if (beginDateFilter > endDateFilter) {
            Swal.fire({
                icon: 'error',
                title: 'Datas Inválidas',
                text: 'A data de início não pode ser posterior à data de fim.',
                confirmButtonColor: '#0ec093',
            });
            return;
        }
        this.executeStatement(beginDateFilter, endDateFilter);
    }

    private executeStatement(begin: Date, end: Date) {
        const priorTransactions = this.allTransactions.filter(
            (t) => new Date(t.dateTime) < begin
        );

        const initialBalanceForPeriod = priorTransactions.reduce(
            (acc, t) => acc + t.amount,
            0
        );

        const finalStatement: Record[] = [];

        let currentBalance = initialBalanceForPeriod;

        for (
            let day = new Date(begin);
            day <= end;
            day.setDate(day.getDate() + 1)
        ) {
            const dailyTransaction = this.allTransactions.filter((t) => {
                const txDate = new Date(t.dateTime);
                return (
                    txDate.getFullYear() === day.getFullYear() &&
                    txDate.getMonth() === day.getMonth() &&
                    txDate.getDate() === day.getDate()
                );
            });

            const totalMovedDaily = dailyTransaction.reduce(
                (acc, t) => acc + t.amount,
                0
            );

            currentBalance += totalMovedDaily;

            finalStatement.push({
                date: new Date(day),
                transactions: dailyTransaction,
                consolidatedBalance: currentBalance,
            });
        }

        this.dailyRecords = finalStatement;
        this.currentPg = 1;
        this.updatePgView();
    }

    updatePgView() {
        this.totalPgs = Math.ceil(this.dailyRecords.length / this.itmsPerPg);
        if (this.currentPg > this.totalPgs && this.totalPgs > 0) {
            this.currentPg = this.totalPgs;
        }
        const start = (this.currentPg - 1) * this.itmsPerPg;
        const end = start + this.itmsPerPg;
        this.pgDailyRecords = this.dailyRecords.slice(start, end);
    }

    goToPg(pg: number) {
        if (pg >= 1 && pg <= this.totalPgs) {
            this.currentPg = pg;
            this.updatePgView();
        }
    }

    nextPg() {
        this.goToPg(this.currentPg + 1);
    }

    previousPg() {
        this.goToPg(this.currentPg - 1);
    }
}
