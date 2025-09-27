import { Injectable } from '@angular/core';
import { Cliente } from '../../models/cliente.model';
import { Manager } from '../../models/manager.model';
import { Transaction } from '../../models/transaction.model';
import { Record } from '../../models/record.model';

export interface AuthUser {
  user: string;      // email ou username
  password: string;  // senha
  role: 'cliente' | 'gerente' | 'admin';
}

@Injectable({
  providedIn: 'root'
})
export class LocalStorageServiceService {

  private readonly USERS_KEY = 'users';

  constructor() {
    this.initDefaultUsers();
  }

  // ---------------- Utils ----------------
  private getData<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private setData<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // ---------------- Users ----------------
  private initDefaultUsers(): void {
    const existing = localStorage.getItem(this.USERS_KEY);
    if (!existing) {
      const defaultUsers: AuthUser[] = [
        { user: 'admin', password: 'admin', role: 'admin' },
        { user: 'adamantio@bantads.com', password: 'adamantio', role: 'admin' }
      ];
      this.setData(this.USERS_KEY, defaultUsers);
    }
  }

  getUsers(): AuthUser[] {
    return this.getData<AuthUser>(this.USERS_KEY);
  }

  addUser(user: AuthUser): void {
    const users = this.getUsers();
    users.push(user);
    this.setData(this.USERS_KEY, users);
  }

  // ---------------- Cliente ----------------
  getClientes(): Cliente[] {
    return this.getData<Cliente>('clientes');
  }

  getClientesPendentes(): Cliente[] {
    const allClients = this.getData<Cliente>('clientes');
    return allClients.filter(c => !c.agencia && !c.conta);
  }


  addCliente(cliente: Cliente): void {
    const clientes = this.getClientes();
    clientes.push(cliente);
    this.setData('clientes', clientes);

    // não cria AuthUser aqui — cliente precisa ser aprovado primeiro
  }

  updateCliente(updatedCliente: Cliente): void {
    const clientes = this.getClientes();
    const idx = clientes.findIndex(c => c.id === updatedCliente.id);
    if (idx !== -1) {
      clientes[idx] = updatedCliente;
      this.setData('clientes', clientes);
    }

    // atualiza usuário do Auth
    const users = this.getUsers();
    const userIdx = users.findIndex(u => u.user === updatedCliente.email);
    if (userIdx !== -1) {
      users[userIdx] = { ...users[userIdx], password: updatedCliente.telefone };
      this.setData(this.USERS_KEY, users);
    }
  }

  deleteCliente(clienteId: string): void {
    let clientes = this.getClientes();
    clientes = clientes.filter(c => c.id !== clienteId);
    this.setData('clientes', clientes);

    // remove usuário do Auth também
    const users = this.getUsers().filter(u => u.user !== clientes.find(c => c.id === clienteId)?.email);
    this.setData(this.USERS_KEY, users);
  }

  approveCliente(pendingCliente: Cliente, password: string, managerId: string): void {
    const clientes = this.getClientes();
    const cliente = clientes.find(c => c.id === pendingCliente.id);

    if (!cliente) {
      throw new Error('Cliente não encontrado para aprovação');
    }

    // encontra o manager que aprovou
    const manager = this.getManagers().find(m => m.id === managerId);
    if (!manager) {
      throw new Error('Manager não encontrado');
    }

    // atualiza o cliente com o manager responsável
    cliente.manager = manager;

    // atualiza os clientes no localStorage
    this.updateCliente(pendingCliente);

    // cria usuário para login com a senha definida pelo gerente
    this.addUser({
      user: cliente.email,
      password,
      role: 'cliente'
    });
  }


  // ---------------- Manager ----------------
  getManagers(): Manager[] {
    return this.getData<Manager>('managers');
  }

  addManager(manager: Manager): void {
    const managers = this.getManagers();
    managers.push(manager);
    this.setData('managers', managers);

    // manager já tem senha no cadastro
    this.addUser({
      user: manager.email,
      password: manager.telephone,
      role: 'gerente'
    });
  }

  updateManager(updatedManager: Manager): void {
    const managers = this.getManagers();
    const idx = managers.findIndex(m => m.id === updatedManager.id);
    if (idx !== -1) {
      managers[idx] = updatedManager;
      this.setData('managers', managers);

      // atualiza usuário do Auth
      const users = this.getUsers();
      const userIdx = users.findIndex(u => u.user === updatedManager.email);
      if (userIdx !== -1) {
        users[userIdx] = { ...users[userIdx], password: updatedManager.telephone };
        this.setData(this.USERS_KEY, users);
      }
    }
  }

  deleteManager(managerId: string): void {
    let managers = this.getManagers();
    const managerToDelete = managers.find(m => m.id === managerId);
    managers = managers.filter(m => m.id !== managerId);
    this.setData('managers', managers);

    // remove usuário do Auth também
    if (managerToDelete) {
      const users = this.getUsers().filter(u => u.user !== managerToDelete.email);
      this.setData(this.USERS_KEY, users);
    }
  }

  // ---------------- Transaction ----------------
  getTransactions(): Transaction[] {
    return this.getData<Transaction>('transactions');
  }

  addTransaction(transaction: Transaction): void {
    const transactions = this.getTransactions();
    transactions.push(transaction);
    this.setData('transactions', transactions);
  }

  // ---------------- Record ----------------
  getRecords(): Record[] {
    return this.getData<Record>('records');
  }

  addRecord(record: Record): void {
    const records = this.getRecords();
    records.push(record);
    this.setData('records', records);
  }
}
