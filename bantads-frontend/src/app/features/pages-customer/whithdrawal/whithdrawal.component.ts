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
import { Observable, Subscription } from 'rxjs';
import { ClientService } from '../../services/client/client.service';
import { TransactionService } from '../../services/transaction/transaction.service';
import { Transaction } from '../../models/transaction.model';
import { ServiceContaService } from '../../services/conta/service-conta.service';

@Component({
    selector: 'app-whithdrawal',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    templateUrl: './whithdrawal.component.html',
    styleUrls: ['./whithdrawal.component.css'],
})
export class WhithdrawalComponent implements OnInit, OnDestroy {
    private fb = inject(FormBuilder);

    cliente$!: Observable<Cliente | null>;
    cliente: Cliente | null = null;
    lastAccess$!: import('rxjs').Observable<string | null>;
    private clienteSub?: Subscription;
    transaction: Transaction | null = null;

    constructor(
        private clientService: ClientService,
        private contaService: ServiceContaService // Injete o serviço
    ) { }


    ngOnInit(): void {
        this.clienteSub = this.clientService
            .getLoggedClient()
            .subscribe((client) => {
                this.cliente = client ?? null;
                // Preenche automaticamente os campos de agência e conta
                if (this.cliente) {
                    this.form.patchValue({
                        agencia: this.cliente.agencia,
                        conta: this.cliente.conta
                    });
                }
            });
    }

    ngOnDestroy(): void {
        this.clienteSub?.unsubscribe();
    }

    form: FormGroup = this.fb.group({
        agencia: [{ value: '', disabled: true }, [Validators.required]],
        conta: [{ value: '', disabled: true }, [Validators.required]],
        valor: [
            null as number | null,
            [Validators.required, Validators.min(0.01)],
        ],
    });

    message: { type: 'success' | 'error'; text: string } | null = null;

    submit() {
        this.message = null;
        if (this.form.invalid || !this.cliente) {
            this.form.markAllAsTouched();
            return;
        }
        const { valor } = this.form.value;

        // Usa o número da conta do cliente logado
        const numeroConta = this.cliente.conta;

        // Integração com Backend (Validação de saldo/limite ocorre no servidor)
        this.contaService.sacar(numeroConta, Number(valor)).subscribe({
            next: () => {
                this.message = { type: 'success', text: 'Saque realizado com sucesso.' };
                this.form.patchValue({ valor: null });
                // Atualiza os dados do cliente após o saque
                this.clientService.getLoggedClient().subscribe((updatedClient) => {
                    this.cliente = updatedClient ?? null;
                });
            },
            error: (err) => {
                // O backend retorna 400 se não houver saldo/limite
                const msg = err.error?.message || 'Erro ao realizar saque.';
                this.message = { type: 'error', text: msg };
            }
        });
    }
}
