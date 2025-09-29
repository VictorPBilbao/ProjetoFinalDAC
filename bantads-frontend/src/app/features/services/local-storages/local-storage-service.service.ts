import { Injectable } from '@angular/core';
import { Cliente } from '../../models/cliente.model';
import { Manager } from '../../models/manager.model';
import { Transaction } from '../../models/transaction.model';
import { Record } from '../../models/record.model';

export interface AuthUser {
    user: string; // email ou username
    password: string; // senha
    role: 'cliente' | 'gerente' | 'admin';
    lastAccess?: string; // ISO date string
}

export interface RejectedClient {
    clienteId: string;
    nome: string;
    email: string;
    cpf: string;
    telefone: string;
    salario: number;
    motivo: string;
    dataRejeicao: string;
    managerId: string;
    managerNome: string;
}

@Injectable({
    providedIn: 'root',
})
export class LocalStorageServiceService {
    private readonly USERS_KEY = 'users';

    constructor() {
        this.initDefaultData();
    }

    // ---------------- Utils ----------------
    private getData<T>(key: string): T[] {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    }

    private setData<T>(key: string, data: T[]): void {
        localStorage.setItem(key, JSON.stringify(data));
    }

    getUsers(): AuthUser[] {
        return this.getData<AuthUser>(this.USERS_KEY);
    }

    addUser(user: AuthUser): void {
        const users = this.getUsers();
        user.lastAccess = new Date().toISOString();
        users.push(user);
        this.setData(this.USERS_KEY, users);
    }

    // ---------------- Cliente ----------------
    getClientes(): Cliente[] {
        return this.getData<Cliente>('clientes');
    }

    getClientesPendentes(): Cliente[] {
        const allClients = this.getData<Cliente>('clientes');
        return allClients.filter((c) => !c.agencia && !c.conta);
    }

    getClienteByUsername(username: string): Cliente | undefined {
        const clientes = this.getClientes();
        return clientes.find((c) => c.email === username);
    }

    addCliente(cliente: Cliente): void {
        const clientes = this.getClientes();
        clientes.push(cliente);
        this.setData('clientes', clientes);

        // não cria AuthUser aqui — cliente precisa ser aprovado primeiro
    }

    updateCliente(updatedCliente: Cliente): void {
        const clientes = this.getClientes();
        const idx = clientes.findIndex((c) => c.id === updatedCliente.id);
        if (idx !== -1) {
            clientes[idx] = updatedCliente;
            this.setData('clientes', clientes);
        }

        // atualiza usuário do Auth
        const users = this.getUsers();
        const userIdx = users.findIndex((u) => u.user === updatedCliente.email);
        if (userIdx !== -1) {
            users[userIdx] = {
                ...users[userIdx],
                password: '123',
            };
            this.setData(this.USERS_KEY, users);
        }
    }

    deleteCliente(clienteId: string): void {
        let clientes = this.getClientes();
        clientes = clientes.filter((c) => c.id !== clienteId);
        this.setData('clientes', clientes);

        // remove usuário do Auth também
        const users = this.getUsers().filter(
            (u) => u.user !== clientes.find((c) => c.id === clienteId)?.email
        );
        this.setData(this.USERS_KEY, users);
    }

    approveCliente(
        pendingCliente: Cliente,
        password: string,
        managerId: string
    ): void {
        const clientes = this.getClientesPendentes();
        const cliente = clientes.find((c) => c.id === pendingCliente.id);

        if (!cliente) {
            throw new Error('Cliente não encontrado para aprovação');
        }

        // encontra o manager que aprovou
        const manager = this.getManagers().find((m) => m.id === managerId);
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
            role: 'cliente',
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
            password: '123',
            role: 'gerente',
        });
    }

    updateManager(updatedManager: Manager): void {
        const managers = this.getManagers();
        const idx = managers.findIndex((m) => m.id === updatedManager.id);
        if (idx !== -1) {
            managers[idx] = updatedManager;
            this.setData('managers', managers);

            // atualiza usuário do Auth
            const users = this.getUsers();
            const userIdx = users.findIndex(
                (u) => u.user === updatedManager.email
            );
            if (userIdx !== -1) {
                users[userIdx] = {
                    ...users[userIdx],
                    password: '123',
                };
                this.setData(this.USERS_KEY, users);
            }
        }
    }

    deleteManager(managerId: string): void {
        let managers = this.getManagers();
        const managerToDelete = managers.find((m) => m.id === managerId);
        managers = managers.filter((m) => m.id !== managerId);
        this.setData('managers', managers);

        // remove usuário do Auth também
        if (managerToDelete) {
            const users = this.getUsers().filter(
                (u) => u.user !== managerToDelete.email
            );
            this.setData(this.USERS_KEY, users);
        }
    }

    // ---------------- Transaction ----------------
    getTransactions(): Transaction[] {
        return this.getData<Transaction>('transactions');
    }

    getTransictionsByClientId(clientId: string): Transaction[] {
        const allTransactions = this.getTransactions();
        return allTransactions.filter((t) => t.clientId === clientId);
    }

    addTransaction(transaction: Transaction): void {
        const transactions = this.getTransactions();
        transactions.push(transaction);
        this.setData('transactions', transactions);
    }

    updateTransaction(updatedTransaction: Transaction): void {
        const transactions = this.getTransactions();
        const idx = transactions.findIndex((t) => t.id === updatedTransaction.id);
        if (idx !== -1) {
            transactions[idx] = updatedTransaction;
            this.setData('transactions', transactions);
        }
    }

    deleteTransaction(transactionId: string): void {
        let transactions = this.getTransactions();
        transactions = transactions.filter((t) => t.id !== transactionId);
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

    // ---------------- Rejected Clients ----------------
    getRejectedClients(): RejectedClient[] {
        return this.getData<RejectedClient>('rejectedClients');
    }

    addRejectedClient(rejectedClient: RejectedClient): void {
        const rejectedClients = this.getRejectedClients();
        rejectedClients.push(rejectedClient);
        this.setData('rejectedClients', rejectedClients);
    }

    rejectCliente(clienteId: string, motivo: string, managerId: string): void {
        const clientes = this.getClientes();
        const cliente = clientes.find((c) => c.id === clienteId);

        if (!cliente) {
            throw new Error('Cliente não encontrado para rejeição');
        }

        // Find the manager who rejected
        const manager = this.getManagers().find((m) => m.id === managerId);
        if (!manager) {
            throw new Error('Manager não encontrado');
        }

        // Create rejected client record
        const rejectedClient: RejectedClient = {
            clienteId: cliente.id,
            nome: cliente.nome,
            email: cliente.email,
            cpf: cliente.cpf,
            telefone: cliente.telefone,
            salario: cliente.salario,
            motivo: motivo.trim(),
            dataRejeicao: new Date().toISOString(),
            managerId: manager.id,
            managerNome: manager.name,
        };

        // Store rejection record
        this.addRejectedClient(rejectedClient);

        // Remove from pending clients list
        this.deleteCliente(clienteId);

        console.log(
            `[REJEIÇÃO] Cliente ${cliente.nome} rejeitado por ${manager.name}. Motivo: ${motivo}`
        );
    }

    initDefaultData(): void {
        // ---- Gerentes ----
        const managers: Manager[] = [
            { id: 'm1', cpf: '98574307084', name: 'Geniéve', email: 'ger1@bantads.com.br', telephone: '11999990001', clients: [], clientCount: 0 },
            { id: 'm2', cpf: '64065268052', name: 'Godophredo', email: 'ger2@bantads.com.br', telephone: '11999990002', clients: [], clientCount: 0 },
            { id: 'm3', cpf: '23862179060', name: 'Gyândula', email: 'ger3@bantads.com.br', telephone: '11999990003', clients: [], clientCount: 0 },
        ];

        // ---- Clientes ----
        const clientes: Cliente[] = [
            {
                id: '1',
                nome: 'Catharyna',
                email: 'cli1@bantads.com.br',
                cpf: '12912861012',
                telefone: '11999990010',
                salario: 10000,
                limite: 10000 * 2,
                saldo: 0,
                manager: { id: 'm1' } as any, // salva só o id
                endereco: {
                    tipo: 'Rua',
                    logradouro: 'das Flores',
                    bairro: 'Jardins',
                    numero: '123',
                    cep: '01458000',
                    cidade: 'São Paulo',
                    estado: 'SP',
                },
                agencia: '0001',
                conta: '12345-6',
                criadoEm: new Date().toISOString(),
            },
            {
                id: '2',
                nome: 'Cleuddônio',
                email: 'cli2@bantads.com.br',
                cpf: '09506382000',
                telefone: '11999990011',
                salario: 20000,
                limite: 20000 * 2,
                saldo: 0,
                manager: { id: 'm2' } as any,
                endereco: {
                    tipo: 'Avenida',
                    logradouro: 'Central',
                    bairro: 'Centro',
                    numero: '456',
                    cep: '01010000',
                    cidade: 'São Paulo',
                    estado: 'SP',
                },
                agencia: '0002',
                conta: '23456-7',
                criadoEm: new Date().toISOString(),
            },
            {
                id: '3',
                nome: 'Catianna',
                email: 'cli3@bantads.com.br',
                cpf: '85733854057',
                telefone: '11999990012',
                salario: 3000,
                limite: 3000 * 2,
                saldo: 0,
                manager: { id: 'm1' } as any,
                endereco: {
                    tipo: 'Praça',
                    logradouro: 'da Liberdade',
                    bairro: 'Liberdade',
                    numero: '789',
                    cep: '01503000',
                    cidade: 'São Paulo',
                    estado: 'SP',
                },
                agencia: '0001',
                conta: '34567-8',
                criadoEm: new Date().toISOString(),
            },
            {
                id: '4',
                nome: 'Cutardo',
                email: 'cli4@bantads.com.br',
                cpf: '58872160006',
                telefone: '11999990013',
                salario: 500,
                limite: 500 * 2,
                saldo: 0,
                manager: { id: 'm3' } as any,
                endereco: {
                    tipo: 'Rua',
                    logradouro: 'do Mercado',
                    bairro: 'Centro',
                    numero: '101',
                    cep: '02020000',
                    cidade: 'São Paulo',
                    estado: 'SP',
                },
                agencia: '0003',
                conta: '45678-9',
                criadoEm: new Date().toISOString(),
            },
            {
                id: '5',
                nome: 'Coândrya',
                email: 'cli5@bantads.com.br',
                cpf: '76179646090',
                telefone: '11999990014',
                salario: 1500,
                limite: 1500 * 2,
                saldo: 0,
                manager: { id: 'm2' } as any,
                endereco: {
                    tipo: 'Avenida',
                    logradouro: 'Paulista',
                    bairro: 'Bela Vista',
                    numero: '202',
                    cep: '01310000',
                    cidade: 'São Paulo',
                    estado: 'SP',
                },
                agencia: '0002',
                conta: '56789-0',
                criadoEm: new Date().toISOString(),
            },
        ];

        // Salva clientes primeiro
        this.setData('clientes', clientes);

        // Atualiza managers com clientCount (sem clients completos para evitar circularidade)
        managers.forEach(m => {
            m.clientCount = clientes.filter(c => c.manager.id === m.id).length;
        });
        this.setData('managers', managers);


        // ---- AuthUsers ----
        const authUsers: AuthUser[] = [
            // Admins
            { user: 'admin', password: 'admin', role: 'admin' },
            { user: 'adamantio@bantads.com', password: 'adamantio', role: 'admin' },
            ...clientes.map(c => ({ user: c.email, password: 'tads', role: 'cliente' as 'cliente' })),
            ...managers.map(m => ({ user: m.email, password: '123', role: 'gerente' as 'gerente' })),
        ];
        this.setData(this.USERS_KEY, authUsers);

        // ---- Transactions ----
        const transactions: Transaction[] = [
            { id: 't1', clientId: '2', dateTime: new Date('2025-01-01T12:00:00'), operation: 'Deposito', amount: 1000 },
            { id: 't2', clientId: '2', dateTime: new Date('2025-01-02T10:00:00'), operation: 'Deposito', amount: 5000 },
            { id: 't3', clientId: '2', dateTime: new Date('2025-01-10T10:00:00'), operation: 'Saque', amount: 200 },
            { id: 't4', clientId: '2', dateTime: new Date('2025-02-05T10:00:00'), operation: 'Deposito', amount: 7000 },
            { id: 't5', clientId: '3', dateTime: new Date('2025-05-05T12:00:00'), operation: 'Deposito', amount: 1000 },
            { id: 't6', clientId: '3', dateTime: new Date('2025-05-06T10:00:00'), operation: 'Saque', amount: 2000 },
            { id: 't7', clientId: '4', dateTime: new Date('2025-06-01T10:00:00'), operation: 'Deposito', amount: 150000 },
            { id: 't8', clientId: '5', dateTime: new Date('2025-07-01T12:00:00'), operation: 'Deposito', amount: 1500 },
        ];
        this.setData('transactions', transactions);

        console.log('[SEED] Dados iniciais criados sem referências circulares ✅');
    }
}
