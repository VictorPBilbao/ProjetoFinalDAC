import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { Cliente } from '../../models/cliente.model';
import {FormBuilder,FormGroup,ReactiveFormsModule,Validators,} from '@angular/forms';
import { Transaction } from '../../models/transaction.model';
import { ClientService } from '../../services/client/client.service';
import { TransactionService } from '../../services/transaction/transaction.service';

@Component({
    selector: 'app-deposito',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './deposito.component.html',
    styleUrls: ['./deposito.component.css'],
})
export class DepositoComponent {
    cliente$!: Observable<Cliente | null>;
    cliente: Cliente | null = null;
    private sub?: Subscription;
    lastAccess$!: string;
    form!: FormGroup;
    message: { type: 'success' | 'error'; text: string } | null = null;

    constructor(
        private fb: FormBuilder,
        private clientService: ClientService,
        private cli: TransactionService
    ) {}
    ngOnInit(): void {
        this.cliente$ = this.clientService
            .getLoggedClient()
            .pipe(map((c) => c ?? null));
        this.sub = this.cliente$.subscribe((c) => {
            this.cliente = c;
            // Preenche automaticamente os campos de agência e conta
            if (this.cliente) {
                this.form.patchValue({
                    agencia: this.cliente.agencia,
                    conta: this.cliente.conta
                });
            }
        });
        this.lastAccess$ = this.clientService.getLastAccess();
        this.form = this.fb.group({
            agencia: [{ value: '', disabled: true }, [Validators.required]],
            conta: [{ value: '', disabled: true }, [Validators.required]],
            valor: [
                null as number | null,
                [Validators.required, Validators.min(0.01)],
            ],
            id1: [''],
            id2: [''],
            id3: [''],
        });
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
    }

    submit() {
        this.message = null;
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const { valor } = this.form.value as {
            agencia: string;
            conta: string;
            valor: number;
        };

        if (!this.cliente) {
            this.message = { type: 'error', text: 'Cliente não encontrado.' };
            return;
        }

        // Atualiza o saldo localmente para feedback imediato
        const updated: Cliente = {
            ...this.cliente,
            saldo: (this.cliente.saldo ?? 0) + Number(valor),
        };

        // Chama o serviço do backend para fazer o depósito
        this.clientService.updateClient(updated).subscribe({
            next: () => {
                // Atualiza os dados do cliente após o depósito
                this.clientService.getLoggedClient().subscribe((updatedClient) => {
                    this.cliente = updatedClient ?? null;
                });

                const tx: Transaction = {
                    id: crypto.randomUUID
                        ? crypto.randomUUID()
                        : Math.random().toString(36).substring(2),
                    clientId: updated.id,
                    dateTime: new Date(),
                    operation: 'Deposito',
                    fromOrToClient: updated.nome ?? updated.email,
                    amount: Number(valor),
                };
                try {
                    this.cli.addTransaction(tx);
                } catch (e) {
                    console.warn('Não foi possível registrar transação', e);
                }

                this.message = {
                    type: 'success',
                    text: `Depósito de R$ ${Number(valor).toFixed(
                        2
                    )} realizado com sucesso.`,
                };
                this.form.patchValue({ valor: null });
            },
            error: (err) => {
                const msg = err.error?.message || 'Erro ao realizar depósito.';
                this.message = { type: 'error', text: msg };
            }
        });
    }

    resetForm() {
        this.form.reset({
            agencia: this.cliente?.agencia ?? '',
            conta: this.cliente?.conta ?? '',
            valor: null,
            id1: '',
            id2: '',
            id3: '',
        });
    }
}
