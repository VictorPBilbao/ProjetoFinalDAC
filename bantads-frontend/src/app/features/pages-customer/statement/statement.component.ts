import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { Transaction } from '../../models/transaction.model';
import { Record } from '../../models/record.model';
import { TransactionService } from '../../services/transaction/transaction.service';
import { LoggedClientService } from '../../services/logged-client/logged-client.service';
import { Cliente } from '../../models/cliente.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-statement',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './statement.component.html',
  styleUrl: './statement.component.css',
})
export class StatementComponent {
  beginDate: string = '';
  endDate: string = '';

  private allTransactions: Transaction[] = [];
  dailyRecords: Record[] = [];
  pgDailyRecords: Record[] = [];

  currentPg: number = 1;
  itmsPerPg: number = 7;
  totalPgs: number = 0;

  private initialBalance = 5000;
  cliente: Cliente | null = null;
  private sub?: Subscription;

  constructor(private transactionService: TransactionService, private loggedClient: LoggedClientService) {
    this.allTransactions = this.transactionService.getTransactions();
    this.sub = this.loggedClient.cliente$.subscribe(c => {
      this.cliente = c;
      // opcional: filtrar transações por conta/cliente se o serviço tiver essa informação
      // não filtrar por conta porque o modelo Transaction atual não contém campos de conta
      // mantemos a inscrição para futuras necessidades
      if (c) {
        this.allTransactions = this.transactionService.getTransactions();
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  getStatement() {
    if (!this.beginDate || !this.endDate) {
      alert('Por favor, preencha as datas de inicio e fim.');
      return;
    }
    const beginDateFilter = new Date(this.beginDate + 'T00:00:00');
    const endDateFilter = new Date(this.endDate + 'T23:59:59');

    if (beginDateFilter > endDateFilter) {
      alert('A data de inicio não pode ser após a data de fim.');
      return;
    }
    this.executeStatement(beginDateFilter, endDateFilter);
  }

  private executeStatement(begin: Date, end: Date) {
    const finalStatement: Record[] = [];
    let currentBalance = this.initialBalance;

    for (
      let day = new Date(begin);
      day <= end;
      day.setDate(day.getDate() + 1)
    ) {
      const dailyTransaction = this.allTransactions.filter(
        (t) =>
          t.dateTime.getFullYear() === day.getFullYear() &&
          t.dateTime.getMonth() === day.getMonth() &&
          t.dateTime.getDate() === day.getDate()
      );

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
