import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { Transaction } from '../../models/transaction.model';
import { Record } from '../../models/record.model';

@Component({
  selector: 'app-statement',
  imports: [FormsModule, CommonModule],
  templateUrl: './statement.component.html',
  styleUrl: './statement.component.css',
})
export class StatementComponent {
  beginDate: string = '';
  endDate: string = '';

  dailyRecords: Record[] = [];

  //Variáveis para tratar a Paginação
  pgDailyRecords: Record[] = [];

  currentPg: number = 1;
  itmsPerPg: number = 7;
  totalPgs: number = 0;

  //Dados de Mock por enquanto

  private initialBalance = 5000;
  private allTransactions: Transaction[] = [
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

  constructor() {}

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

    // Filtra as transações dentro dos parâmetros pegando por dia
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
    this.updatePgView(); //Chama a paginação da tela
  }

  //Método para gerenciar as paginações
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
