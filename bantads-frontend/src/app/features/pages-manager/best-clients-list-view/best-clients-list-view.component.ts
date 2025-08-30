import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cliente } from './../../models/cliente.model';

@Component({
  selector: 'app-best-clients-list-view',
  imports: [CommonModule],
  templateUrl: './best-clients-list-view.component.html',
  styleUrl: './best-clients-list-view.component.css'
})
export class BestClientsListViewComponent implements OnInit {

  constructor() { }
  clientesEmDestaque: Cliente[] = [];

  ngOnInit(): void {
    this.carregarClientes();
  }
  carregarClientes(): void {

    const todosOsClientes: Cliente[] = [

      { id: '1', nome: 'Guilherme Arthur', email: '', cpf: '123.456.789-00', telefone: '', salario: 0, limite: 0, saldo: 1250000, gerenteNome: '', endereco: { tipo: '', logradouro: '', numero: '', cep: '', cidade: 'Curitiba', estado: 'PR' }, agencia: '', conta: '', criadoEm: '' },
      { id: '2', nome: 'Leonardo Chicora', email: '', cpf: '111.222.333-44', telefone: '', salario: 0, limite: 0, saldo: 790000, gerenteNome: '', endereco: { tipo: '', logradouro: '', numero: '', cep: '', cidade: 'Curitiba', estado: 'PR' }, agencia: '', conta: '', criadoEm: '' },
      { id: '3', nome: 'Adriano Zandroski', email: '', cpf: '444.555.666-77', telefone: '', salario: 0, limite: 0, saldo: 500000, gerenteNome: '', endereco: { tipo: '', logradouro: '', numero: '', cep: '', cidade: 'Curitiba', estado: 'PR' }, agencia: '', conta: '', criadoEm: '' },
      { id: '4', nome: 'Binicius Kataguiri', email: '', cpf: '987.654.321-09', telefone: '', salario: 0, limite: 0, saldo: 850000, gerenteNome: '', endereco: { tipo: '', logradouro: '', numero: '', cep: '', cidade: 'Curitiba', estado: 'PR' }, agencia: '', conta: '', criadoEm: '' },
      { id: '5', nome: 'Victor Passini', email: '', cpf: '888.999.000-11', telefone: '', salario: 0, limite: 0, saldo: -15000, gerenteNome: '', endereco: { tipo: '', logradouro: '', numero: '', cep: '', cidade: 'Curitiba', estado: 'PR' }, agencia: '', conta: '', criadoEm: '' }
    ];

    const clientesOrdenados = todosOsClientes.sort((a, b) => {
      return b.saldo - a.saldo;
    });

    this.clientesEmDestaque = clientesOrdenados.slice(0, 3);
  }
}
