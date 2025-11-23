import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';

import { Cliente } from '../../models/cliente.model';
import { ClientService } from '../../services/client/client.service';
import { ServiceContaService } from '../../services/conta/service-conta.service';

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
    lastAccess$!: Date;
    form!: FormGroup;
    message: { type: 'success' | 'error'; text: string } | null = null;

    constructor(
        private fb: FormBuilder,
        private clientService: ClientService,
        private accountService: ServiceContaService
    ) {}
    ngOnInit(): void {
        this.cliente$ = this.clientService
            .getLoggedClient()
            .pipe(map((c) => c ?? null));
        this.sub = this.cliente$.subscribe((c) => {
            this.cliente = c;
            if (this.cliente) {
                this.form.patchValue({
                    agencia: this.cliente.agencia,
                    conta: this.cliente.conta,
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

        const { valor } = this.form.value;
        const valorNumerico = Number(valor);

        if (!this.cliente || !this.cliente.conta) {
            this.message = {
                type: 'error',
                text: 'Conta do cliete não encontrada.',
            };
            return;
        }

        const numeroConta = this.cliente.conta;

        this.accountService.depositar(numeroConta, valorNumerico).subscribe({
            next: () => {
                this.message = {
                    type: 'success',
                    text: `Depósito de R$ ${valorNumerico.toFixed(
                        2
                    )} realizado com sucesso.`,
                };

                this.form.patchValue({ valor: null });

                this.refreshClientData();
            },
            error: (err) => {
                console.error(`Erro no depósito: ${err}`);
                const msg = err.error?.message || 'Erro ao realizar depósito.';
                this.message = { type: 'error', text: msg };
            },
        });
    }

    refreshClientData() {
        this.clientService.getLoggedClient().subscribe((updatedClient) => {
            this.cliente = updatedClient ?? null;
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
