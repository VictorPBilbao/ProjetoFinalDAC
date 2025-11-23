import { Observable, Subscription } from 'rxjs';

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
import { Transaction } from '../../models/transaction.model';
import { ClientService } from '../../services/client/client.service';
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
    lastAccess$!: Date;
    private clienteSub?: Subscription;
    transaction: Transaction | null = null;

    constructor(
        private clientService: ClientService,
        private contaService: ServiceContaService
    ) {}

    ngOnInit(): void {
        this.clienteSub = this.clientService
            .getLoggedClient()
            .subscribe((client) => {
                this.cliente = client ?? null;
                if (this.cliente) {
                    this.form.patchValue({
                        agencia: this.cliente.agencia,
                        conta: this.cliente.conta,
                    });
                }
            });
        this.lastAccess$ = this.clientService.getLastAccess();
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

        const numeroConta = this.cliente.conta;

        this.contaService.sacar(numeroConta, Number(valor)).subscribe({
            next: () => {
                this.message = {
                    type: 'success',
                    text: 'Saque realizado com sucesso.',
                };
                this.form.patchValue({ valor: null });
                this.clientService
                    .getLoggedClient()
                    .subscribe((updatedClient) => {
                        this.cliente = updatedClient ?? null;
                    });
            },
            error: (err) => {
                const msg = err.error?.message || 'Erro ao realizar saque.';
                this.message = { type: 'error', text: msg };
            },
        });
    }
}
