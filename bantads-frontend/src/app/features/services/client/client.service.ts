import { Injectable } from '@angular/core';
import { Cliente } from '../../models/cliente.model';
import { Manager } from '../../models/manager.model';

@Injectable({
  providedIn: 'root',
})
export class ClientService {
  private readonly LS_CHAVE = 'clientsData';
  private clients: Cliente[] = [];

  constructor() {
    this.initializeData();
  }

  getClients(): Cliente[] {
    return this.clients;
  }

  getClientById(id: string): Cliente | undefined {
    return this.clients.find((client) => client.id === id);
  }

  addClient(newClient: Omit<Cliente, 'id' | 'criadoEm'>): void {
    const id = new Date().getTime().toString();
    const criadoEm = new Date().toISOString();

    const clientToAdd: Cliente = { ...newClient, id, criadoEm };

    this.clients.push(clientToAdd);
    this.persist();
  }

  updateClient(updatedClient: Cliente): void {
    const index = this.clients.findIndex(
      (client) => client.id === updatedClient.id
    );
    if (index !== -1) {
      this.clients[index] = updatedClient;
      this.persist();
    }
  }

  deleteClient(id: string): void {
    this.clients = this.clients.filter((client) => client.id !== id);
    this.persist();
  }

  private persist(): void {
    localStorage.setItem(this.LS_CHAVE, JSON.stringify(this.clients));
  }

  private initializeData(): void {
    if (!localStorage.getItem(this.LS_CHAVE)) {
      this.seedInitialData();
    }
    this.clients = this.loadFromStorage();
  }

  private loadFromStorage(): Cliente[] {
    const jsonData = localStorage.getItem(this.LS_CHAVE);
    return jsonData ? JSON.parse(jsonData) : [];
  }

  private seedInitialData(): void {
    const gerente1: Manager = {
      id: 'g1',
      name: 'Carlos Pereira',
      cpf: '999.888.777-11',
      email: 'carlos.p@bank.com',
      telephone: '(11) 91111-2222',
    };
    const gerente2: Manager = {
      id: 'g2',
      name: 'Roberta Andrade',
      cpf: '666.555.444-22',
      email: 'roberta.a@bank.com',
      telephone: '(21) 93333-4444',
    };
    const initialClients: Cliente[] = [
      {
        id: '1',
        nome: 'Ana Costa',
        email: 'ana.costa@example.com',
        cpf: '111.222.333-44',
        telefone: '(11) 98765-4321',
        salario: 5000,
        limite: 2500,
        saldo: 10250.75,
        manager: gerente1,
        endereco: {
          tipo: 'Rua',
          logradouro: 'das Flores',
          bairro: 'Jardim Primavera',
          numero: '123',
          cep: '01000-000',
          cidade: 'São Paulo',
          estado: 'SP',
        },
        agencia: '001',
        conta: '12345-6',
        criadoEm: '2023-01-15',
      },
      {
        id: '2',
        nome: 'Bruno Lima',
        email: 'bruno.lima@example.com',
        cpf: '222.333.444-55',
        telefone: '(21) 91234-5678',
        salario: 7500,
        limite: 3750,
        saldo: -500.0,
        manager: gerente1,
        endereco: {
          tipo: 'Avenida',
          logradouro: 'Copacabana',
          bairro: 'Copacabana',
          numero: '456',
          cep: '22000-000',
          cidade: 'Rio de Janeiro',
          estado: 'RJ',
        },
        agencia: '001',
        conta: '23456-7',
        criadoEm: '2023-02-20',
      },
      {
        id: '3',
        nome: 'Carla Dias',
        email: 'carla.dias@example.com',
        cpf: '333.444.555-66',
        telefone: '(31) 95678-1234',
        salario: 4000,
        limite: 2000,
        saldo: 7320.1,
        manager: gerente2,
        endereco: {
          tipo: 'Rua',
          logradouro: 'Ouro Preto',
          bairro: 'Centro',
          numero: '789',
          cep: '30000-000',
          cidade: 'Belo Horizonte',
          estado: 'MG',
        },
        agencia: '002',
        conta: '34567-8',
        criadoEm: '2023-03-10',
      },
      {
        id: '4',
        nome: 'Daniel Alves',
        email: 'daniel.alves@example.com',
        cpf: '444.555.666-77',
        telefone: '(41) 98888-7777',
        salario: 9000,
        limite: 4500,
        saldo: 25000.0,
        manager: gerente1,
        endereco: {
          tipo: 'Rua',
          logradouro: 'XV de Novembro',
          bairro: 'Centro',
          numero: '101',
          cep: '80000-000',
          cidade: 'Curitiba',
          estado: 'PR',
        },
        agencia: '001',
        conta: '45678-9',
        criadoEm: '2023-04-05',
      },
      {
        id: '5',
        nome: 'Eduarda Souza',
        email: 'eduarda.souza@example.com',
        cpf: '555.666.777-88',
        telefone: '(51) 99999-8888',
        salario: 6200,
        limite: 3100,
        saldo: 1200.5,
        manager: gerente2,
        endereco: {
          tipo: 'Avenida',
          logradouro: 'Ipiranga',
          bairro: 'Centro',
          numero: '202',
          cep: '90000-000',
          cidade: 'Porto Alegre',
          estado: 'RS',
        },
        agencia: '002',
        conta: '56789-0',
        criadoEm: '2023-05-12',
      },
    ];

    localStorage.setItem(this.LS_CHAVE, JSON.stringify(initialClients));
  }
}
