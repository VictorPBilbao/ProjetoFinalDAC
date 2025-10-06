import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Cliente } from '../../models/cliente.model';
import { ClientService } from '../../services/client/client.service';
import { Subscription } from 'rxjs';
import { CpfPipe } from '../../shared/pipes/cpf.pipe';

@Component({
    selector: 'app-clients-report',
    standalone: true,
    imports: [FormsModule, CommonModule, RouterLink, CpfPipe],
    templateUrl: './clients-report.component.html',
    styleUrl: './clients-report.component.css',
})
export class ClientsReportComponent implements OnInit, OnDestroy {
    private allClients: Cliente[] = [];
    filteredClients: Cliente[] = [];
    pgClients: Cliente[] = [];

    search: string = '';

    currentPg: number = 1;
    itmsPerPg: number = 7;
    totalPgs: number = 0;

    private clientsSubscription?: Subscription;

    constructor(private clientService: ClientService) { }

    ngOnInit(): void {
        this.clientsSubscription = this.clientService.getClients().subscribe({
            next: (clients) => {
                this.allClients = clients;

                this.allClients.sort((a, b) => a.nome.localeCompare(b.nome));

                this.filterClients();
            },
            error: (err) => {
                console.error('Erro ao carregar clientes:', err);
            },
        });
    }

    ngOnDestroy(): void {
        this.clientsSubscription?.unsubscribe();
    }

    filterClients(): void {
        const keyword = this.search.toLowerCase().trim();
        if (!keyword) {
            this.filteredClients = [...this.allClients];
        } else {
            this.filteredClients = this.allClients.filter(
                (client) =>
                    client.nome.toLowerCase().includes(keyword) ||
                    client.cpf
                        .replace(/[.-]/g, '')
                        .includes(keyword.replace(/[.-]/g, ''))
            );
        }
        this.currentPg = 1;
        this.updatePgView();
    }

    updatePgView() {
        this.totalPgs = Math.ceil(this.filteredClients.length / this.itmsPerPg);
        if (this.currentPg > this.totalPgs && this.totalPgs > 0) {
            this.currentPg = this.totalPgs;
        }
        const start = (this.currentPg - 1) * this.itmsPerPg;
        const end = start + this.itmsPerPg;
        this.pgClients = this.filteredClients.slice(start, end);
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
