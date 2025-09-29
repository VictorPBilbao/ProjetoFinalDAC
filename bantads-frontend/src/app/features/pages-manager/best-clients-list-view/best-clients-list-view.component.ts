import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cliente } from './../../models/cliente.model';

import { ClientService } from '../../services/client/client.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-best-clients-list-view',
    imports: [CommonModule],
    templateUrl: './best-clients-list-view.component.html',
    styleUrl: './best-clients-list-view.component.css',
})
export class BestClientsListViewComponent implements OnInit, OnDestroy {
    clientesEmDestaque: Cliente[] = [];
    feedbackMessage: string = '';
    private clientsSubscription?: Subscription;

    constructor(private clientService: ClientService) {}

    ngOnInit(): void {
        this.carregarClientes();
    }

    carregarClientes(): void {
        this.clientsSubscription = this.clientService.getClients().subscribe({
            next: (todosOsClientes) => {
                const clientesOrdenados = todosOsClientes.sort((a, b) => {
                    return b.saldo - a.saldo;
                });

                this.clientesEmDestaque = clientesOrdenados.slice(0, 3);
            },
            error: (err) => {
                this.feedbackMessage =
                    'Não foi possível carregar a lista de clientes.';
                console.error('Erro ao carregar clientes:', err);
            },
        });
    }

    ngOnDestroy(): void {
        this.clientsSubscription?.unsubscribe();
    }
}
