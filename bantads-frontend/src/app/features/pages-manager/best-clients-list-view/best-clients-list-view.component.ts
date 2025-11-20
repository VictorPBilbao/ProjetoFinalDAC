import { Subscription } from 'rxjs';

import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';

import { Cliente } from '../../models/cliente.model';
import { AuthService } from '../../services/auth/auth.service';
import { ManagerService } from '../../services/manager/manager.service';
import { CpfPipe } from '../../shared/pipes/cpf.pipe';

@Component({
    selector: 'app-best-clients-list-view',
    standalone: true,
    imports: [CommonModule, CpfPipe],
    templateUrl: './best-clients-list-view.component.html',
    styleUrl: './best-clients-list-view.component.css',
})
export class BestClientsListViewComponent implements OnInit, OnDestroy {
    clientesEmDestaque: Cliente[] = [];
    isLoading: boolean = true;
    private dataSubscription?: Subscription;
    selectedClient: Cliente | null = null;
    errorMsg: string = '';

    constructor(
        private managerService: ManagerService,
        private authService: AuthService
    ) {}

    ngOnInit(): void {
        this.carregarClientesDoGerente();
    }

    carregarClientesDoGerente(): void {
        this.isLoading = true;
        this.errorMsg = '';

        this.dataSubscription = this.managerService.getBestClients().subscribe({
            next: (clientes) => {
                this.clientesEmDestaque = clientes;
                this.isLoading = false;

                if (clientes.length === 0) {
                    this.errorMsg = 'Nenhum cliente encontrado para este gerente.';
                }
            },
            error: (err) => {
                this.errorMsg = 'Não foi possível carregar a lista de melhores clientes.';
                console.error('Erro na tela R14:', err);
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
