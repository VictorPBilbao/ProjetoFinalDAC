import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { Cliente } from '../../models/cliente.model';
import { ClientService } from '../../services/client/client.service';
import { CpfPipe } from '../../shared/pipes/cpf.pipe';

@Component({
    selector: 'app-list-clients',
    standalone: true,
    imports: [FormsModule, CommonModule, RouterLink, CpfPipe],
    templateUrl: './list-clients.component.html',
    styleUrl: './list-clients.component.css',
})
export class ListClientsComponent implements OnInit, OnDestroy {
    private allClients: Cliente[] = [];
    filteredClients: Cliente[] = [];
    pgClients: Cliente[] = [];

    search: string = '';
    isLoading = true;

    currentPg: number = 1;
    itmsPerPg: number = 7;
    totalPgs: number = 0;

    modalOpen = false;
    selectedClient?: Cliente;

    private clientsSubscription?: Subscription;

    constructor(private clientService: ClientService) {}

    ngOnInit(): void {
        this.isLoading = true;
        this.clientsSubscription = this.clientService
            .getClients()
            .subscribe((clients) => {
                this.allClients = clients.sort((a, b) =>
                    a.nome.localeCompare(b.nome)
                );

                this.filterClients();
                this.isLoading = false;
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

    openModal(cliente: Cliente): void {
        this.selectedClient = cliente;
        this.modalOpen = true;
    }

    closeModal(): void {
        this.modalOpen = false;
        this.selectedClient = undefined;
    }

    @HostListener('document:keydown.escape', ['$event'])
    onKeydownHandler(event: KeyboardEvent) {
        this.closeModal();
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
