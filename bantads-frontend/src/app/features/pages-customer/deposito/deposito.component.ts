import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subscription } from 'rxjs';
import { Cliente } from '../../models/cliente.model';
import {
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { Transaction } from '../../models/transaction.model';
import { ClientService } from '../../services/client/client.service';
import { TransactionService } from '../../services/transaction/transaction.service';
import { ServiceContaService } from '../../services/conta/service-conta.service';

@Component({
    selector: 'app-deposito',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './deposito.component.html',
    styleUrls: ['./deposito.component.css'],
})
export class DepositoComponent {
    cliente$!: Observable<Cliente | undefined>;
    cliente: Cliente | null = null;
    private sub?: Subscription;
    lastAccess$!: string;
    form!: FormGroup;
    message: { type: 'success' | 'error'; text: string } | null = null;

    constructor(
        private fb: FormBuilder,
        private clientService: ClientService,
        private contaService: ServiceContaService // Injete o serviço correto
    ) { }

    ngOnInit(): void {
        this.cliente$ = this.clientService.getLoggedClient();
        this.lastAccess$ = this.clientService.getLastAccess();
        this.form = this.fb.group({
            agencia: ['', [Validators.required]],
            conta: ['', [Validators.required]],
            valor: [
                null as number | null,
                [Validators.required, Validators.min(0.01)],
            ],
            id1: [''],
            id2: [''],
            id3: [''],
        });

        this.sub = this.cliente$?.subscribe((c) => {
            this.cliente = c ?? null;
            if (this.form) {
                this.form.patchValue({
                    agencia: this.cliente?.agencia ?? '',
                    conta: this.cliente?.conta ?? '',
                });
            }
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

        const { agencia, conta, valor } = this.form.value;

        if (!this.cliente || this.cliente.conta !== conta) {
             this.message = { type: 'error', text: 'Conta inválida.' };
             return;
        }

        // Integração com Backend
        this.contaService.depositar(conta, Number(valor)).subscribe({
            next: (res) => {
                this.message = { type: 'success', text: `Depósito de R$ ${valor} realizado com sucesso.` };
                this.form.patchValue({ valor: null });
                // Opcional: Atualizar saldo na tela via clientService ou recarregar
            },
            error: (err) => {
                this.message = { type: 'error', text: 'Erro ao realizar depósito.' };
                console.error(err);
            }
        });
    }

    resetForm() {
        // reseta apenas o valor mantendo agência/conta preenchidos a partir do cliente
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
