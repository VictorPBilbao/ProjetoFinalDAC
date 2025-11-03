import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { Cliente } from '../../models/cliente.model';
import { Manager } from '../../models/manager.model';
import { Observable, Subscription, of } from 'rxjs';
import { LocalStorageServiceService } from '../../services/local-storages/local-storage-service.service';
import { TransactionService } from '../../services/transaction/transaction.service';
import { ClientService } from '../../services/client/client.service';
import { Transaction } from '../../models/transaction.model';

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
        private storageService: LocalStorageServiceService,
        private transactionService: TransactionService
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
        const { agencia, conta, contaDestino, valor } = this.form.value as {
            agencia: string;
            conta: string;
            contaDestino: string;
            valor: number;
        };

        // Regra: transferir apenas da conta do cliente
        if (
            !this.cliente ||
            agencia !== this.cliente.agencia ||
            conta !== this.cliente.conta
        ) {
            this.message = {
                type: 'error',
                text: 'Você só pode transferir da sua conta.',
            };
            return;
        }

        // Regra: saldo suficiente considerando limite
        const disponivel =
            (this.cliente?.saldo ?? 0) + (this.cliente?.limite ?? 0);
        if (valor > disponivel) {
            this.message = {
                type: 'error',
                text: 'Saldo insuficiente considerando o limite.',
            };
            return;
        }

        // Executa transferência (somente no frontend - mock)
        if (this.cliente) {
            const debitAmount = Number(valor);

            // debita conta do cliente logado
            const updatedOrigin = {
                ...this.cliente,
                saldo: this.cliente.saldo - debitAmount,
            } as Cliente;
            this.clientService.updateClient(updatedOrigin);
            this.cliente = updatedOrigin;

            // tenta localizar cliente destino por número da conta
            const allClientes = this.storageService.getClientes();
            const destino = allClientes.find((c) => c.conta === contaDestino);

            if (destino) {
                const updatedDestino = {
                    ...destino,
                    saldo: (destino.saldo ?? 0) + debitAmount,
                } as Cliente;
                // persiste destino e origem
                this.storageService.updateCliente(updatedDestino);
                this.storageService.updateCliente(updatedOrigin);
                // registra transações (origem negativa, destino positiva)
                try {
                    this.transactionService.addTransaction({
                        id: crypto.randomUUID(),
                        clientId: this.cliente.id,
                        dateTime: new Date(),
                        operation: 'Transferencia',
                        fromOrToClient: destino.nome,
                        amount: -debitAmount,
                    } as any);
                    this.transactionService.addTransaction({
                        id: crypto.randomUUID(),
                        clientId: destino.id,
                        dateTime: new Date(),
                        operation: 'Transferencia',
                        fromOrToClient: this.cliente.nome,
                        amount: debitAmount,
                    } as any);
                } catch {
                    /* noop */
                }
                // notifica mudanças globais
                try {
                    window.dispatchEvent(new Event('clientUpdated'));
                } catch {
                    /* noop */
                }
            } else {
                // conta destino não encontrada entre clientes — ainda persiste a origem e registra a transação de saída
                this.storageService.updateCliente(updatedOrigin);
                try {
                    this.transaction = {
                        id: crypto.randomUUID(),
                        clientId: this.cliente.id,
                        operation: 'Transferencia',
                        amount: -debitAmount,
                        dateTime: new Date(),
                    };

                    this.transactionService.addTransaction(this.transaction);
                } catch {
                    /* noop */
                }
            }
        }
        const now = new Date().toISOString();
        this.lastTransfer = {
            destinoConta: contaDestino,
            valor: Number(valor),
            timestamp: now,
        };
        this.message = {
            type: 'success',
            text: `Transferência de ${valor.toFixed(
                2
            )} realizada para ${contaDestino} em ${new Date(
                now
            ).toLocaleString()}.`,
        };
        this.form.patchValue({ valor: null, contaDestino: '' });
    }
}
