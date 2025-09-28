
import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subscription } from 'rxjs';
import { Cliente } from '../../models/cliente.model';
import { LoggedClientService } from '../../services/logged-client/logged-client.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LocalStorageServiceService } from '../../services/local-storages/local-storage-service.service';
import { Transaction } from '../../models/transaction.model';

@Component({
  selector: 'app-deposito',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './deposito.component.html',
  styleUrls: ['./deposito.component.css'] 
})
export class DepositoComponent {
  cliente$!: Observable<Cliente | null>;
  cliente: Cliente | null = null;
  private sub?: Subscription;
  lastAccess$!: Observable<string | null>;

  form: FormGroup;
  message: { type: 'success' | 'error'; text: string } | null = null;

  constructor(
    private loggedClientService: LoggedClientService,
    private fb: FormBuilder,
    private storageService: LocalStorageServiceService
  ) {
    this.cliente$ = this.loggedClientService.cliente$;
    this.form = this.fb.group({
      agencia: ['', [Validators.required]],
      conta: ['', [Validators.required]],
      valor: [null as number | null, [Validators.required, Validators.min(0.01)]],
      id1: [''],
      id2: [''],
      id3: ['']
    });

    this.sub = this.cliente$.subscribe(c => {
      this.cliente = c;
      if (c) {
        this.form.patchValue({ agencia: c.agencia ?? '', conta: c.conta ?? '' });
      }
    });
    this.lastAccess$ = this.loggedClientService.lastAccess$;
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

    const { agencia, conta, valor } = this.form.value as { agencia: string; conta: string; valor: number };

    if (!this.cliente) {
      this.message = { type: 'error', text: 'Cliente não encontrado.' };
      return;
    }

    // exige que depósito seja na conta do cliente (preenchida automaticamente)
    if (agencia !== this.cliente.agencia || conta !== this.cliente.conta) {
      this.message = { type: 'error', text: 'Informe a sua agência e conta corretas para depósito.' };
      return;
    }

    const updated: Cliente = { ...this.cliente, saldo: (this.cliente.saldo ?? 0) + Number(valor) };

    // Persiste cliente atualizado e atualiza observable
    this.loggedClientService.updateClient(updated);

    // registra transação localmente
    const tx: Transaction = { dateTime: new Date(), operation: 'Deposito', fromOrToClient: updated.nome ?? updated.email, amount: Number(valor) };
    try {
      this.storageService.addTransaction(tx);
    } catch (e) {
      // não bloqueia a atualização do saldo se não conseguir adicionar transação
      console.warn('Não foi possível registrar transação', e);
    }

    this.message = { type: 'success', text: `Depósito de R$ ${Number(valor).toFixed(2)} realizado com sucesso.` };
    this.form.patchValue({ valor: null });
  }

  resetForm() {
    // reseta apenas o valor mantendo agência/conta preenchidos a partir do cliente
    this.form.reset({ agencia: this.cliente?.agencia ?? '', conta: this.cliente?.conta ?? '', valor: null, id1: '', id2: '', id3: '' });
  }
}
