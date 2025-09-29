import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, forkJoin } from 'rxjs';

import { Cliente } from './../../models/cliente.model';
import { Manager } from './../../models/manager.model';

import { ClientService } from '../../services/client/client.service';
import { ManagerService } from '../../services/manager/manager.service';
import { AuthService } from '../../services/auth/auth.service';

@Component({
    selector: 'app-best-clients-list-view',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './best-clients-list-view.component.html',
    styleUrl: './best-clients-list-view.component.css',
})
export class BestClientsListViewComponent implements OnInit, OnDestroy {
    clientesEmDestaque: Cliente[] = [];
    feedbackMessage: string = '';
    isLoading: boolean = true;
    private dataSubscription?: Subscription;

    constructor(
        private clientService: ClientService,
        private managerService: ManagerService,
        private authService: AuthService
    ) {}

    ngOnInit(): void {
        this.carregarClientesDoGerente();
    }

    carregarClientesDoGerente(): void {
        this.isLoading = true;
        const loggedUser = this.authService.getUser();

        if (!loggedUser || loggedUser.role !== 'gerente') {
            this.isLoading = false;
            this.feedbackMessage = 'Nenhum gerente logado.';
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

    ngOnDestroy(): void {
        this.dataSubscription?.unsubscribe();
    }
}
