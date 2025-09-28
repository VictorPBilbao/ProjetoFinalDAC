
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { Cliente } from '../../models/cliente.model';
import { Manager } from '../../models/manager.model';

@Component({
  selector: 'app-deposito',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './deposito.component.html',
  styleUrls: ['./deposito.component.css'] 
})
export class DepositoComponent {
  // Mock cliente state similar aos demais componentes
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
}
