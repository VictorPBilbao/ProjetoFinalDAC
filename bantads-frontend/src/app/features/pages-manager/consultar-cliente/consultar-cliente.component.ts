import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Cliente } from '../../models/cliente.model';
import { ClientService } from '../../services/client/client.service';

@Component({
    selector: 'app-consultar-cliente',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './consultar-cliente.component.html',
    styleUrls: ['./consultar-cliente.component.css'],
})
export class ConsultarClienteComponent implements OnInit {
    allClients: Cliente[] = [];
    foundClient: Cliente | null = null;
    search: string = '';
    feedbackMessage: string = '';

    constructor(private clientService: ClientService) {}

    ngOnInit(): void {
        this.clientService.getClients().subscribe({
            next: (clients) => {
                this.allClients = clients.sort((a, b) =>
                    a.nome.localeCompare(b.nome)
                );
            },
            error: () => {
                this.feedbackMessage = 'Erro ao carregar clientes.';
            },
        });
    }

    findClient(): void {
        const term = this.search.trim().toLowerCase();

        if (!term) {
            this.foundClient = null;
            this.feedbackMessage = '';
            return;
        }

        const result = this.allClients.find(
            (client) =>
                client.nome.toLowerCase().includes(term) ||
                client.cpf.replace(/[.-]/g, '') === term.replace(/[.-]/g, '')
        );

        if (result) {
            this.foundClient = result;
            this.feedbackMessage = '';
        } else {
            this.foundClient = null;
            this.feedbackMessage =
                'Nenhum cliente encontrado com os dados informados.';
        }
    }
}
