import { Observable, of, Subscription } from 'rxjs';

import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import {
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { RouterModule } from '@angular/router';

import { Cliente } from '../../models/cliente.model';
import { Manager } from '../../models/manager.model';
import { Transaction } from '../../models/transaction.model';
import { ClientService } from '../../services/client/client.service';
import { LocalStorageServiceService } from '../../services/local-storages/local-storage-service.service';
import { TransactionService } from '../../services/transaction/transaction.service';
import { ServiceContaService } from '../../services/conta/service-conta.service';

@Component({
    selector: 'app-transfer',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    templateUrl: './transfer.component.html',
    styleUrls: ['./transfer.component.css'],
})
export class TransferComponent implements OnDestroy, OnInit {
    private fb = inject(FormBuilder);

    cliente$!: Observable<Cliente | null>;
    cliente: Cliente | null = null;
    lastAccess$!: string;
    transaction: Transaction | null = null;

    form: FormGroup = this.fb.group({
        agencia: ['', [Validators.required]],
        conta: ['', [Validators.required]],
        contaDestino: ['', [Validators.required]],
        valor: [
            null as number | null,
            [Validators.required, Validators.min(0.01)],
        ],
    });

    message: { type: 'success' | 'error'; text: string } | null = null;
    lastTransfer: {
        destinoConta: string;
        valor: number;
        timestamp: string;
    } | null = null;

    darkMode: boolean = false;

    constructor(
        private clientService: ClientService,
        private contaService: ServiceContaService // Injete o serviço
    ) {}

    ngOnInit(): void {
        // restaura preferência de tema
        try {
            this.darkMode = localStorage.getItem('transfer_dark') === 'true';
        } catch {
            this.darkMode = false;
        }
        this.cliente = this.clientService.getLoggedClient() || null;
        this.lastAccess$ = this.clientService.getLastAccess();
        // expõe como observable para o template
        this.cliente$ = of(this.cliente);
        // preenche os campos de origem com os dados do cliente logado
        if (this.cliente) {
            this.form.patchValue({
                agencia: this.cliente.agencia,
                conta: this.cliente.conta,
            });
        }
    }

    ngOnDestroy(): void {}

    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        try {
            localStorage.setItem('transfer_dark', String(this.darkMode));
        } catch {
            /* noop */
        }
    }

    submit() {
        this.message = null;
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const { conta, contaDestino, valor } = this.form.value;

        this.contaService.transferir(conta, contaDestino, Number(valor)).subscribe({
            next: () => {
                this.message = { type: 'success', text: 'Transferência realizada com sucesso.' };
                this.lastTransfer = {
                    destinoConta: contaDestino,
                    valor: Number(valor),
                    timestamp: new Date().toISOString(),
                };
                this.form.patchValue({ valor: null, contaDestino: '' });
            },
            error: (err) => {
                const msg = err.error?.message || 'Erro na transferência. Verifique o saldo ou a conta destino.';
                this.message = { type: 'error', text: msg };
            }
        });
    }
}
