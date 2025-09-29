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

    getPending(): Cliente[] {
        return this.storage.getClientesPendentes();
    }

    approve(clientId: string): { ok: boolean; message: string } {
        const pending = this.getPending();
        const idx = pending.findIndex((c) => c.id === clientId);
        if (idx === -1) {
            return {
                ok: false,
                message: 'Cliente não encontrado nos pendentes.',
            };
        }
        const client = pending[idx];

        // calcular limite: salario >= 2000 => limite = salario / 2
        client.limite = client.salario >= 2000 ? client.salario / 2 : 0;

        // escolher manager com menos clientes
        const managers = this.storage.getManagers();
        const clients = this.storage.getClientes();
        const managerClientCounts: Record<string, number> = {};
        managers.forEach((m) => {
            if (m.id) managerClientCounts[m.id] = 0;
        });
        clients.forEach((c) => {
            if (c.manager?.id) {
                managerClientCounts[c.manager.id] =
                    (managerClientCounts[c.manager.id] || 0) + 1;
            }
        });
        const sortedManagers = [...managers].sort(
            (a, b) =>
                (managerClientCounts[a.id || ''] || 0) -
                (managerClientCounts[b.id || ''] || 0)
        );
        const chosen = sortedManagers[0];

        // gerar numero de conta unico (4 digitos)
        let conta: string;
        const existingContas = new Set(clients.map((c) => c.conta));
        do {
            conta = Math.floor(1000 + Math.random() * 9000).toString();
        } while (existingContas.has(conta));

        client.manager = chosen;
        client.conta = conta;
        client.agencia = '0001';
        client.saldo = 0;

        // adiciona ao array oficial de clientes
        this.storage.approveCliente(client, '123', client.manager.id); // telephone é a senha temporária

        console.log(
            `[APROVACAO] Cliente ${client.nome} aprovado. Conta: ${client.conta}`
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
