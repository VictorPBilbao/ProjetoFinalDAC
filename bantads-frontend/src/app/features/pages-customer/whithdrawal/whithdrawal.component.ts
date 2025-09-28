import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Cliente } from '../../models/cliente.model';
import { Manager } from '../../models/manager.model';
import { LoggedClientService } from '../../services/logged-client/logged-client.service';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-whithdrawal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './whithdrawal.component.html',
  styleUrls: ['./whithdrawal.component.css']
})
export class WhithdrawalComponent {
  private fb = inject(FormBuilder);

  cliente$!: Observable<Cliente | null>;
  cliente: Cliente | null = null;
  private clienteSub?: Subscription;

  constructor(private loggedClient: LoggedClientService) {
    this.cliente$ = this.loggedClient.cliente$;
    this.clienteSub = this.cliente$.subscribe(c => {
      this.cliente = c;
      // Preenche automaticamente agência/conta no formulário quando o cliente estiver disponível
      if (c) {
        this.form.patchValue({ agencia: c.agencia ?? '', conta: c.conta ?? '' });
      }
    });
  }

  ngOnDestroy(): void {
    this.clienteSub?.unsubscribe();
  }

  form: FormGroup = this.fb.group({
    agencia: ['', [Validators.required]],
    conta: ['', [Validators.required]],
    valor: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  message: { type: 'success' | 'error'; text: string } | null = null;

  submit() {
    this.message = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { agencia, conta, valor } = this.form.value as { agencia: string; conta: string; valor: number };

    // Regra: não sacar de outra conta
    if (!this.cliente || agencia !== this.cliente.agencia || conta !== this.cliente.conta) {
      this.message = { type: 'error', text: 'Você não pode sacar de outra conta.' };
      return;
    }

    // Regra: saldo suficiente considerando limite
    const disponivel = (this.cliente?.saldo ?? 0) + (this.cliente?.limite ?? 0);
    if (valor > disponivel) {
      this.message = { type: 'error', text: 'Saldo insuficiente considerando o limite.' };
      return;
    }

    // Atualiza saldo localmente (frontend-only)
    if (this.cliente) {
      const updated = { ...this.cliente, saldo: this.cliente.saldo - Number(valor) } as Cliente;
      this.loggedClient.updateClient(updated);
      this.cliente = updated;
    }
    this.message = { type: 'success', text: 'Saque realizado com sucesso.' };
    this.form.patchValue({ valor: null });
  }
}
