import { Injectable } from '@angular/core';
import { Manager } from '../../models/manager.model';
import { Cliente } from '../../models/cliente.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardAdminService {

  private readonly MANAGERS_KEY = 'managers'; // Chave para armazenar gerentes no localStorage
  private readonly CLIENTES_KEY = 'clients'; // Chave para armazenar clientes no localStorage

  constructor() {
    this.initData(); // initialize mock data
  }

  getManagers(): Manager[] { //get all managers
    const managersJson = localStorage.getItem(this.MANAGERS_KEY);
    return managersJson ? JSON.parse(managersJson) : [];
  }

  getClients(): Cliente[] { //get all clients
    const clientsJson = localStorage.getItem(this.CLIENTES_KEY);
    return clientsJson ? JSON.parse(clientsJson) : [];
  }

  getManagersWithClients(): Manager[] { //get all managers with their clients
    const managers = this.getManagers();
    const clients = this.getClients();

    managers.forEach(manager => {
      manager.clients = clients.filter(c => c.manager && c.manager.id === manager.id);
    });

    return managers;
  }

  private initData(): void { // Initialize mock data if not present
    const managersExisting = localStorage.getItem(this.MANAGERS_KEY);
    if (!managersExisting) {
      const mockManagers: Manager[] = [ // mock data for managers
        { id: '1', name: 'Thalita Santos', cpf: '596.644.780-24', email: 'thalita@bantads.com', telephone: '(41) 3361-4904' },
        { id: '2', name: 'Ana Carolina', cpf: '943.173.280-70', email: 'ana@bantads.com', telephone: '(41) 3361-4904' },
        { id: '3', name: 'Godofredo Pimentel', cpf: '123.456.789-10', email: 'godofredo@bantads.com', telephone: '(41) 3361-4904' }
      ];

      const mockClients: Cliente[] = [ // mock data for clients
        {
          id: '1', nome: 'Guilherme Arthur', email: '', cpf: '123.456.789-00', telefone: '', salario: 0, limite: 0, saldo: 1250000,
          manager: mockManagers[0],
          endereco: { tipo: '', logradouro: '', bairro: '', numero: '', cep: '', cidade: 'Curitiba', estado: 'PR' }, agencia: '', conta: '', criadoEm: ''
        },
        {
          id: '2', nome: 'Leonardo Chicora', email: '', cpf: '111.222.333-44', telefone: '', salario: 0, limite: 0, saldo: 790000,
          manager: mockManagers[0],
          endereco: { tipo: '', logradouro: '', bairro: '', numero: '', cep: '', cidade: 'Curitiba', estado: 'PR' }, agencia: '', conta: '', criadoEm: ''
        },
        {
          id: '3', nome: 'Victor Passini', email: '', cpf: '888.999.000-11', telefone: '', salario: 0, limite: 0, saldo: -15000,
          manager: mockManagers[2],
          endereco: { tipo: '', logradouro: '', bairro: '', numero: '', cep: '', cidade: 'Curitiba', estado: 'PR' }, agencia: '', conta: '', criadoEm: ''
        },
        {
          id: '7', nome: 'Fernanda Moura', email: '', cpf: '555.666.777-88', telefone: '', salario: 0, limite: 0, saldo: -42000,
          manager: mockManagers[0],
          endereco: { tipo: '', logradouro: '', bairro: '', numero: '', cep: '', cidade: 'Curitiba', estado: 'PR' }, agencia: '', conta: '', criadoEm: ''
        },
        {
          id: '8', nome: 'Rafael Silva', email: '', cpf: '101.202.303-40', telefone: '', salario: 0, limite: 0, saldo: 350000,
          manager: mockManagers[2],
          endereco: { tipo: '', logradouro: '', bairro: '', numero: '', cep: '', cidade: 'Curitiba', estado: 'PR' }, agencia: '', conta: '', criadoEm: ''
        },
        {
          id: '4', nome: 'Adriano Zandroski', email: '', cpf: '444.555.666-77', telefone: '', salario: 0, limite: 0, saldo: 500000,
          manager: mockManagers[1],
          endereco: { tipo: '', logradouro: '', bairro: '', numero: '', cep: '', cidade: 'Curitiba', estado: 'PR' }, agencia: '', conta: '', criadoEm: ''
        },
        {
          id: '5', nome: 'Binicius Kataguiri', email: '', cpf: '987.654.321-09', telefone: '', salario: 0, limite: 0, saldo: -120000,
          manager: mockManagers[1],
          endereco: { tipo: '', logradouro: '', bairro: '', numero: '', cep: '', cidade: 'Curitiba', estado: 'PR' }, agencia: '', conta: '', criadoEm: ''
        },
        {
          id: '6', nome: 'Marina Souza', email: '', cpf: '222.333.444-55', telefone: '', salario: 0, limite: 0, saldo: 900000,
          manager: mockManagers[1],
          endereco: { tipo: '', logradouro: '', bairro: '', numero: '', cep: '', cidade: 'Curitiba', estado: 'PR' }, agencia: '', conta: '', criadoEm: ''
        },
        {
          id: '9', nome: 'Carlos Eduardo', email: '', cpf: '666.777.888-99', telefone: '', salario: 0, limite: 0, saldo: -90000,
          manager: mockManagers[2],
          endereco: { tipo: '', logradouro: '', bairro: '', numero: '', cep: '', cidade: 'Curitiba', estado: 'PR' }, agencia: '', conta: '', criadoEm: ''
        },
        {
          id: '10', nome: 'Patricia Lopes', email: '', cpf: '333.444.555-66', telefone: '', salario: 0, limite: 0, saldo: 420000,
          manager: mockManagers[2],
          endereco: { tipo: '', logradouro: '', bairro: '', numero: '', cep: '', cidade: 'Curitiba', estado: 'PR' }, agencia: '', conta: '', criadoEm: ''
        },
        {
          id: '11', nome: 'Juliana Prado', email: '', cpf: '888.222.111-00', telefone: '', salario: 0, limite: 0, saldo: -55000,
          manager: mockManagers[2],
          endereco: { tipo: '', logradouro: '', bairro: '', numero: '', cep: '', cidade: 'Curitiba', estado: 'PR' }, agencia: '', conta: '', criadoEm: ''
        },
        {
          id: '12', nome: 'Marcelo Torres', email: '', cpf: '777.111.222-33', telefone: '', salario: 0, limite: 0, saldo: -83000,
          manager: mockManagers[0],
          endereco: { tipo: '', logradouro: '', bairro: '', numero: '', cep: '', cidade: 'Curitiba', estado: 'PR' }, agencia: '', conta: '', criadoEm: ''
        }
      ];
      localStorage.setItem(this.MANAGERS_KEY, JSON.stringify(mockManagers)); // save mock data to localStorage
      localStorage.setItem(this.CLIENTES_KEY, JSON.stringify(mockClients)); // save mock data to localStorage
    }
  }
}
