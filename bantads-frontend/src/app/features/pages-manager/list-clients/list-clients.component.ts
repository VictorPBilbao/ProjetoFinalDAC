import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; // Import Router para navegação

import { Cliente } from '../../models/cliente.model';
import { ClientService } from '../../services/client/client.service';
import { CpfPipe } from '../../shared/pipes/cpf.pipe';

@Component({
    selector: 'app-list-clients',
    standalone: true,
    imports: [FormsModule, CommonModule, CpfPipe],
    templateUrl: './list-clients.component.html',
    styleUrl: './list-clients.component.css',
})
export class ListClientsComponent implements OnInit, OnDestroy {
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

    constructor(private clientService: ClientService, private router: Router) {}

    ngOnInit(): void {
        this.loadClients();
    }

    ngOnDestroy(): void {
        this.clientsSubscription?.unsubscribe();
    }

    loadClients(searchTerm: string = ''): void {
        this.isLoading = true;

        this.clientsSubscription?.unsubscribe();

        this.clientsSubscription = this.clientService
            .getClients(searchTerm)
            .subscribe({
                next: (clients) => {
                    this.filteredClients = clients.sort((a, b) =>
                        a.nome.localeCompare(b.nome)
                    );

                    this.currentPg = 1;
                    this.updatePgView();
                    this.isLoading = false;
                },
                error: (err) => {
                    console.error('Erro ao listar clientes:', err);
                    this.isLoading = false;
                },
            });
    }

    filterClients(): void {
        const keyword = this.search.trim();
        this.loadClients(keyword);
    }

    viewClient(cliente: Cliente): void {
        this.router.navigate(['/manager/consultar-cliente', cliente.cpf]);
    }

    openModal(cliente: Cliente): void {
        this.selectedClient = cliente;
        this.modalOpen = true;
    }

    closeModal(): void {
        this.modalOpen = false;
        this.selectedClient = undefined;
    }

    @HostListener('document:keydown', ['$event'])
    onKeydownHandler(event: Event) {
        const keyboardEvent = event as KeyboardEvent;
        if (keyboardEvent.key === 'Escape' || keyboardEvent.key === 'Esc') {
            this.closeModal();
        }
    }

    updatePgView() {
        this.totalPgs = Math.ceil(this.filteredClients.length / this.itmsPerPg);

        if (this.totalPgs === 0) {
            this.currentPg = 1;
        } else if (this.currentPg > this.totalPgs) {
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
