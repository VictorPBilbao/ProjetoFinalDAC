import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { Cliente } from '../../models/cliente.model';
import { Manager } from '../../models/manager.model';
import { LoggedClientService } from '../../services/logged-client/logged-client.service';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-transfer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './transfer.component.html',
  styleUrls: ['./transfer.component.css']
})
export class TransferComponent {
  private fb = inject(FormBuilder);

  cliente$!: Observable<Cliente | null>;
  cliente: Cliente | null = null;
  lastAccess$!: Observable<string | null>;

  form: FormGroup = this.fb.group({
    agencia: ['', [Validators.required]],
    conta: ['', [Validators.required]],
    contaDestino: ['', [Validators.required]],
    valor: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  message: { type: 'success' | 'error'; text: string } | null = null;

  lastTransfer: { destinoConta: string; valor: number; timestamp: string } | null = null;

  constructor(private loggedClient: LoggedClientService) {
    this.cliente$ = this.loggedClient.cliente$;
    this.cliente$.subscribe(c => {
      this.cliente = c;
      if (c) {
        this.form.patchValue({ agencia: c.agencia ?? '', conta: c.conta ?? '' });
      }
    });
    this.lastAccess$ = this.loggedClient.lastAccess$;
  }

  ngOnDestroy(): void {
    // se houver subscription adicionada no futuro, cancelar aqui
  }

  submit() {
    this.message = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { agencia, conta, contaDestino, valor } = this.form.value as { agencia: string; conta: string; contaDestino: string; valor: number };

    // Regra: transferir apenas da conta do cliente
    if (!this.cliente || agencia !== this.cliente.agencia || conta !== this.cliente.conta) {
      this.message = { type: 'error', text: 'Você só pode transferir da sua conta.' };
      return;
    }

    // Regra: saldo suficiente considerando limite
    const disponivel = (this.cliente?.saldo ?? 0) + (this.cliente?.limite ?? 0);
    if (valor > disponivel) {
      this.message = { type: 'error', text: 'Saldo insuficiente considerando o limite.' };
      return;
    }

    // Executa transferência (somente no frontend - mock)
    if (this.cliente) {
      const updated = { ...this.cliente, saldo: this.cliente.saldo - Number(valor) } as Cliente;
      this.loggedClient.updateClient(updated);
      this.cliente = updated;
    }
    const now = new Date().toISOString();
    this.lastTransfer = { destinoConta: contaDestino, valor: Number(valor), timestamp: now };
    this.message = { type: 'success', text: `Transferência de ${valor.toFixed(2)} realizada para ${contaDestino} em ${new Date(now).toLocaleString()}.` };
    this.form.patchValue({ valor: null, contaDestino: '' });
  }
}
