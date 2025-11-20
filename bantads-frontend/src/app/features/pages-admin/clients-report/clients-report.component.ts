import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Cliente } from '../../models/cliente.model';
import { ClientService } from '../../services/client/client.service';
import { CpfPipe } from '../../shared/pipes/cpf.pipe';

@Component({
    selector: 'app-clients-report',
    standalone: true,
    imports: [CommonModule, FormsModule, CpfPipe],
    templateUrl: './clients-report.component.html',
    styleUrls: ['./clients-report.component.css'],
})
export class ClientsReportComponent implements OnInit {
    allClients: Cliente[] = [];
    pgClients: Cliente[] = [];

    isLoading = false;
    searchTerm = '';

    currentPg = 1;
    itmsPerPg = 10;
    totalPgs = 0;

    constructor(private clientService: ClientService) {}

    ngOnInit(): void {
        this.loadReport();
    }

    loadReport() {
        this.isLoading = true;

        this.clientService
            .getClients(this.searchTerm, 'adm_relatorio_clientes')
            .subscribe({
                next: (data) => {
                    this.allClients = data.sort((a, b) =>
                        a.nome.localeCompare(b.nome)
                    );

                    this.currentPg = 1;
                    this.updatePgView();
                    this.isLoading = false;
                },
                error: (err) => {
                    console.error('Erro ao carregar relatório R16:', err);
                    this.isLoading = false;
                },
            });
    }

    onSearch() {
        this.loadReport();
    }

    updatePgView() {
        this.totalPgs = Math.ceil(this.allClients.length / this.itmsPerPg);

        if (this.totalPgs === 0) {
            this.currentPg = 1;
        } else if (this.currentPg > this.totalPgs) {
            this.currentPg = this.totalPgs;
        }

        const start = (this.currentPg - 1) * this.itmsPerPg;
        const end = start + this.itmsPerPg;

        this.pgClients = this.allClients.slice(start, end);
    }

    nextPg() {
        if (this.currentPg < this.totalPgs) {
            this.currentPg++;
            this.updatePgView();
        }
    }

    previousPg() {
        if (this.currentPg > 1) {
            this.currentPg--;
            this.updatePgView();
        }
    }
}
