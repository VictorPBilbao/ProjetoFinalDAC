import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Record } from '../../models/record.model';
import { ServiceContaService } from '../../services/conta/service-conta.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-statement',
    standalone: true,
    imports: [FormsModule, CommonModule],
    templateUrl: './statement.component.html',
    styleUrl: './statement.component.css',
})
export class StatementComponent implements OnInit {
    beginDate: string = '';
    endDate: string = '';

    dailyRecords: Record[] = [];
    pgDailyRecords: Record[] = [];

    currentPg: number = 1;
    itmsPerPg: number = 7;
    totalPgs: number = 0;

    isLoading = false;
    numeroConta: string | null = null;

    constructor(private contaService: ServiceContaService) {}

    ngOnInit(): void {
        this.contaService.getMinhaConta().subscribe({
            next: (conta) => {
                this.numeroConta =
                    conta.numero || conta.conta || conta.accountNumber;
            },
            error: (err) => {
                console.error('Erro ao buscar conta:', err);
                Swal.fire(
                    'Erro',
                    'Não foi possível localizar sua conta.',
                    'error'
                );
            },
        });
    }

    getStatement() {
        if (!this.numeroConta) {
            Swal.fire('Aguarde', 'Carregando dados da conta...', 'info');
            return;
        }
        if (!this.beginDate || !this.endDate) {
            Swal.fire(
                'Atenção',
                'Por favor, preencha as datas de início e fim.',
                'warning'
            );
            return;
        }

        const start = new Date(this.beginDate);
        const end = new Date(this.endDate);

        if (start > end) {
            Swal.fire(
                'Erro',
                'Data de início não pode ser maior que o fim.',
                'error'
            );
            return;
        }

        this.isLoading = true;

        this.contaService
            .getStatement(this.numeroConta, this.beginDate, this.endDate)
            .subscribe({
                next: (dados) => {
                    this.dailyRecords = dados;
                    this.currentPg = 1;
                    this.updatePgView();
                    this.isLoading = false;
                },
                error: (err) => {
                    this.isLoading = false;
                    console.error(err);
                    Swal.fire('Erro', 'Falha ao carregar o extrato.', 'error');
                },
            });
    }

    updatePgView() {
        this.totalPgs = Math.ceil(this.dailyRecords.length / this.itmsPerPg);
        if (this.totalPgs === 0) this.currentPg = 1;

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
