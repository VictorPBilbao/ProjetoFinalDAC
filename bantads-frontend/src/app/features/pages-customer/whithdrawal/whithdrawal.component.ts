import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { Cliente } from '../../models/cliente.model';
import { Manager } from '../../models/manager.model';

@Component({
  selector: 'app-whithdrawal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './whithdrawal.component.html',
  styleUrls: ['./whithdrawal.component.css']
})
export class WhithdrawalComponent {
  private fb = inject(FormBuilder);

  // Estado mockado de cliente apenas no frontend
  private readonly _cliente$ = new BehaviorSubject<Cliente>({
    id: '1',
    nome: 'Cliente Exemplo',
    email: 'cliente@example.com',
    cpf: '00000000000',
    telefone: '(41) 99999-0000',
    salario: 2000,
    limite: 100.0,
    saldo: -82.42,
    manager: { id: 'm1', cpf: '11122233344', name: 'Gerente Exemplo', email: 'gerente@example.com', telephone: '(41) 98888-0000' } as Manager,
    endereco: {
      tipo: 'Rua',
      logradouro: 'Exemplo',
      bairro: 'Centro',
      numero: '123',
      cep: '80000-000',
      cidade: 'Curitiba',
      estado: 'PR',
    },
    agencia: '756-0',
    conta: '97193-6',
    criadoEm: new Date().toISOString(),
  });

  cliente$ = this._cliente$.asObservable();
  get cliente(): Cliente { return this._cliente$.value; }

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
    if (agencia !== this.cliente.agencia || conta !== this.cliente.conta) {
      this.message = { type: 'error', text: 'Você não pode sacar de outra conta.' };
      return;
    }

    // Regra: saldo suficiente considerando limite
    const disponivel = this.cliente.saldo + this.cliente.limite;
    if (valor > disponivel) {
      this.message = { type: 'error', text: 'Saldo insuficiente considerando o limite.' };
      return;
    }

    // Atualiza saldo localmente (frontend-only)
    this._cliente$.next({ ...this.cliente, saldo: this.cliente.saldo - Number(valor) });
    this.message = { type: 'success', text: 'Saque realizado com sucesso.' };
    this.form.patchValue({ valor: null });
  }
}
