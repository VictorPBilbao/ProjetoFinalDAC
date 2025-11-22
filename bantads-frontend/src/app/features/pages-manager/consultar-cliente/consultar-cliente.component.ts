import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { Cliente } from '../../models/cliente.model';
import { ClientService } from '../../services/client/client.service';
import { CpfPipe } from '../../shared/pipes/cpf.pipe';
import { LoadingService } from '../../services/utils/loading-service.service';

@Component({
    selector: 'app-consultar-cliente',
    standalone: true,
    imports: [CommonModule, FormsModule, CpfPipe],
    templateUrl: './consultar-cliente.component.html',
    styleUrls: ['./consultar-cliente.component.css'],
})
export class ConsultarClienteComponent implements OnInit {
    foundClient: Cliente | null = null;
    search: string = '';
    feedbackMessage: string = '';

    constructor(
        private clientService: ClientService,
        private loadingService: LoadingService,
        private route: ActivatedRoute
    ) { }

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            const cpf = params['cpf'];
            if (cpf) {
                this.search = cpf;
                this.findClient();
            }
        });
    }

    findClient(): void {
        const term = this.search.replace(/\D/g, '');

        if (!term) {
            this.foundClient = null;
            this.feedbackMessage = 'Por favor, digite um CPF válido.';
            return;
        }

        if (term.length !== 11) {
            this.feedbackMessage = 'O CPF deve conter 11 dígitos.';
            this.foundClient = null;
            return;
        }

        this.loadingService.show();
        this.feedbackMessage = '';
        this.foundClient = null;

        this.clientService.getClientById(term).subscribe({
            next: (client) => {
                if (client) {
                    this.foundClient = client;
                    this.feedbackMessage = '';
                } else {
                    this.foundClient = null;
                    this.feedbackMessage = 'Cliente não encontrado para o CPF informado.';
                }
                this.loadingService.hide();
            },
            error: (err) => {
                console.error('Erro na busca:', err);
                this.foundClient = null;
                this.feedbackMessage = 'Cliente não encontrado ou erro no sistema.';
                this.loadingService.hide();
            },
        });
    }
}
