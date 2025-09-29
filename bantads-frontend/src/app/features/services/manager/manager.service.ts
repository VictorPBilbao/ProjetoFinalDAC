import { Injectable } from '@angular/core';
import { Cliente } from '../../models/cliente.model';
import { Manager } from '../../models/manager.model';
import {
    LocalStorageServiceService,
    RejectedClient,
} from '../../services/local-storages/local-storage-service.service';
import { AuthService } from '../auth/auth.service';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ManagerService {
    constructor(
        private readonly storage: LocalStorageServiceService,
        private readonly authService: AuthService
    ) {}

    getManagersWithTotals(): Observable<Manager[]> {
        const managers = this.storage.getManagers();
        const clientes = this.storage.getClientes();

        managers.forEach((manager) => {
            const assignedClients = clientes.filter(
                (c) => (c.manager as any)?.id === manager.id
            );

            manager.clientCount = assignedClients.length;

            manager.positiveTotal = assignedClients.reduce((acc, cli) => {
                return acc + (cli.saldo >= 0 ? cli.saldo : 0);
            }, 0);

            manager.negativeTotal = assignedClients.reduce((acc, cli) => {
                return acc + (cli.saldo < 0 ? cli.saldo : 0);
            }, 0);
        });
        return of(managers).pipe(delay(500));
    }

    getPending(): Cliente[] {
        return this.storage.getClientesPendentes();
    }

    approve(clientId: string): { ok: boolean; message: string } {
        const pending = this.getPending();
        const client = pending.find((c) => c.id === clientId);
        if (!client) {
            return {
                ok: false,
                message: 'Cliente não encontrado nos pendentes.',
            };
        }

        const currentUser = this.authService.getUser();
        if (!currentUser || currentUser.role !== 'gerente') {
            return {
                ok: false,
                message: 'Ação permitida apenas para gerentes autenticados.',
            };
        }

        const managers = this.storage.getManagers();
        const approvingManager = managers.find(
            (m) => m.email === currentUser.user
        );

        if (!approvingManager) {
            return {
                ok: false,
                message: 'Gerente autenticado não encontrado no sistema.',
            };
        }

        client.manager = approvingManager;

        client.limite = client.salario >= 2000 ? client.salario / 2 : 0;

        const allClients = this.storage.getClientes();
        let conta: string;
        const existingContas = new Set(allClients.map((c) => c.conta));
        do {
            conta = Math.floor(1000 + Math.random() * 9000).toString();
        } while (existingContas.has(conta));

        client.conta = conta;
        client.agencia = '0001';
        client.saldo = 0;

        // Passa o ID do gerente correto para o método de aprovação do storage
        this.storage.approveCliente(client, '123', approvingManager.id);

        console.log(
            `[APROVACAO] Cliente ${client.nome} aprovado por ${approvingManager.name}. Conta: ${client.conta}`
        );

        return { ok: true, message: 'Cliente aprovado com sucesso.' };
    }

    reject(clientId: string, reason: string): { ok: boolean; message: string } {
        if (!reason?.trim()) {
            return { ok: false, message: 'Motivo é obrigatório.' };
        }

        const pending = this.getPending();
        const cliente = pending.find((c) => c.id === clientId);
        if (!cliente) {
            return {
                ok: false,
                message: 'Cliente não encontrado nos pendentes.',
            };
        }

        // Get current logged manager
        const currentUser = this.authService.getUser();
        if (!currentUser) {
            return {
                ok: false,
                message: 'Usuário não autenticado.',
            };
        }

        // Find manager by email
        const managers = this.storage.getManagers();
        const currentManager = managers.find(
            (m) => m.email === currentUser.user
        );
        if (!currentManager) {
            return {
                ok: false,
                message: 'Manager não encontrado.',
            };
        }

        try {
            // Use the new rejection method from LocalStorageService
            this.storage.rejectCliente(clientId, reason, currentManager.id);

            // Simulate email sending (as mentioned in R11)
            console.log(
                `[EMAIL SIMULADO] Enviando email para ${cliente.email} informando rejeição.`
            );
            console.log(`Motivo: ${reason}`);
            console.log(`Data/Hora: ${new Date().toLocaleString('pt-BR')}`);

            return {
                ok: true,
                message: `Cliente ${cliente.nome} foi rejeitado e removido da lista. Email de notificação enviado.`,
            };
        } catch (error) {
            console.error('Erro ao rejeitar cliente:', error);
            return {
                ok: false,
                message: 'Erro interno ao processar rejeição.',
            };
        }
    }

    // ---------------- CREATE ----------------
    createManager(manager: Manager): Observable<any> {
        // Gera ID simples
        const newManager: Manager = {
            ...manager,
            id: Date.now().toString(),
        };

        // Salva no localStorage
        this.storage.addManager(newManager);

        // Simula resposta da API
        const response = {
            success: true,
            message: 'Gerente criado com sucesso!',
            data: newManager,
        };

        return of(response).pipe(delay(1000)); // simula delay
    }

    verifyManagerByCPF(cpf: string): Observable<{ exists: boolean }> {
        const exists = this.storage.getManagers().some((m) => m.cpf === cpf);
        return of({ exists }).pipe(delay(500));
    }

    // ---------------- READ ----------------
    getManagers(): Observable<Manager[]> {
        const managers = this.storage.getManagers();
        return of(managers).pipe(delay(500));
    }

    getManagerById(managerId: string): Observable<Manager | undefined> {
        const manager = this.storage
            .getManagers()
            .find((m) => m.id === managerId);
        return of(manager).pipe(delay(500));
    }

    // ---------------- UPDATE ----------------
    updateManager(updated: Manager): Observable<any> {
        const managers = this.storage
            .getManagers()
            .map((m) => (m.id === updated.id ? { ...m, ...updated } : m));
        // Salva de volta
        localStorage.setItem('managers', JSON.stringify(managers));

        const response = {
            success: true,
            message: 'Gerente atualizado com sucesso!',
            data: updated,
        };

        return of(response).pipe(delay(1000));
    }

    // ---------------- DELETE ----------------
    deleteManager(managerId: string): Observable<any> {
        const managers = this.storage
            .getManagers()
            .filter((m) => m.id !== managerId);
        localStorage.setItem('managers', JSON.stringify(managers));

        const response = {
            success: true,
            message: 'Gerente removido com sucesso!',
            id: managerId,
        };

        return of(response).pipe(delay(1000));
    }

    // ---------------- REJECTED CLIENTS ----------------
    getRejectedClients(): Observable<RejectedClient[]> {
        const rejectedClients = this.storage.getRejectedClients();
        return of(rejectedClients).pipe(delay(500));
    }
}
