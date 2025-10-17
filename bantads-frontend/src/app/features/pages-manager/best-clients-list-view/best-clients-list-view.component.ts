import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';

import { Cliente } from './../../models/cliente.model';
import { Manager } from './../../models/manager.model';

import { ClientService } from '../../services/client/client.service';
import { ManagerService } from '../../services/manager/manager.service';
import { AuthService } from '../../services/auth/auth.service';
import { CpfPipe } from '../../shared/pipes/cpf.pipe';

@Component({
    selector: 'app-best-clients-list-view',
    standalone: true,
    imports: [CommonModule, CpfPipe, RouterLink],
    templateUrl: './best-clients-list-view.component.html',
    styleUrl: './best-clients-list-view.component.css',
})
export class BestClientsListViewComponent implements OnInit, OnDestroy {
    clientesEmDestaque: Cliente[] = [];
    feedbackMessage: string = '';
    isLoading: boolean = true;
    private dataSubscription?: Subscription;
    selectedClient: Cliente | null = null;
    errorMsg: string = '';

    constructor(
        private clientService: ClientService,
        private managerService: ManagerService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.carregarClientesDoGerente();
    }

    carregarClientesDoGerente(): void {
        this.isLoading = true;
        const loggedUser = this.authService.getUser();

        if (!loggedUser || loggedUser.role !== 'gerente') {
            this.isLoading = false;
            this.errorMsg = 'Nenhum gerente logado.';
            return;
        }

        this.dataSubscription = forkJoin({
            clients: this.clientService.getClients(),
            managers: this.managerService.getManagers(),
        }).subscribe({
            next: ({ clients, managers }) => {
                const currentManager = managers.find(
                    (m) => m.email === loggedUser.user
                );

                if (currentManager) {
                    const managerClients = clients.filter(
                        (c) => c.manager?.id === currentManager.id
                    );

                    const clientesOrdenados = managerClients.sort((a, b) => {
                        return b.saldo - a.saldo;
                    });

                    this.clientesEmDestaque = clientesOrdenados.slice(0, 3);
                }

                this.isLoading = false;
            },
            error: (err) => {
                this.feedbackMessage =
                    'Não foi possível carregar a lista de clientes.';
                console.error('Erro ao carregar dados:', err);
                this.isLoading = false;
            },
        });
    }

    selectHighlight(cliente: Cliente): void {
        if (this.selectedClient?.id === cliente.id) {
            this.selectedClient = null;
        } else {
            this.selectedClient = cliente;
        }
    }

    trackById(index: number, cliente: Cliente): string {
        return cliente.id;
    }

    ngOnDestroy(): void {
        this.dataSubscription?.unsubscribe();
    }
}
