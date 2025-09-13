import { Injectable } from '@angular/core';
import { Cliente } from '../../models/cliente.model';
import { DashboardAdminService } from '../dashboard-admin.service';

// This service simulates backend behavior for manager approvals (R9, R10, R11)
// It stores pending clients separately until approved or rejected.
// Later this should be replaced by HTTP calls + SAGA orchestration.

@Injectable({ providedIn: 'root' })
export class ManagerService {
    private readonly PENDING_KEY = 'pendingClients';
    private readonly CLIENTS_KEY = 'clients';

    constructor(private readonly dashboardAdmin: DashboardAdminService) {}

    // Seed some pending clients if none exist (mock for prototype)
    private ensureSeed(): void {
        const existing = localStorage.getItem(this.PENDING_KEY);
        if (!existing) {
            const seed: Cliente[] = [
                {
                    id: 'p1',
                    nome: 'Novo Cliente 1',
                    email: 'novo1@example.com',
                    cpf: '123.111.222-33',
                    telefone: '(41) 99999-0001',
                    salario: 3500,
                    limite: 0,
                    saldo: 0,
                    manager: undefined as any,
                    endereco: {
                        tipo: 'Rua',
                        logradouro: 'Alpha',
                        bairro: 'Centro',
                        numero: '10',
                        cep: '80000-000',
                        cidade: 'Curitiba',
                        estado: 'PR',
                    },
                    agencia: '',
                    conta: '',
                    criadoEm: new Date().toISOString(),
                },
                {
                    id: 'p2',
                    nome: 'Novo Cliente 2',
                    email: 'novo2@example.com',
                    cpf: '456.222.333-44',
                    telefone: '(41) 99999-0002',
                    salario: 1200,
                    limite: 0,
                    saldo: 0,
                    manager: undefined as any,
                    endereco: {
                        tipo: 'Rua',
                        logradouro: 'Beta',
                        bairro: 'Centro',
                        numero: '22',
                        cep: '80000-001',
                        cidade: 'Curitiba',
                        estado: 'PR',
                    },
                    agencia: '',
                    conta: '',
                    criadoEm: new Date().toISOString(),
                },
            ];
            localStorage.setItem(this.PENDING_KEY, JSON.stringify(seed));
        }
    }

    getPending(): Cliente[] {
        this.ensureSeed();
        const raw = localStorage.getItem(this.PENDING_KEY);
        return raw ? JSON.parse(raw) : [];
    }

    private savePending(list: Cliente[]): void {
        localStorage.setItem(this.PENDING_KEY, JSON.stringify(list));
    }

    private saveClients(list: Cliente[]): void {
        localStorage.setItem(this.CLIENTS_KEY, JSON.stringify(list));
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

        // calculate limit: >= 2000 => limit = salario / 2
        const limit = client.salario >= 2000 ? client.salario / 2 : 0;

        // find manager with fewer clients
        const managers = this.dashboardAdmin.getManagers();
        const clients = this.dashboardAdmin.getClients();
        const managerClientCounts: Record<string, number> = {};
        managers.forEach((m) => {
            if (m.id) {
                managerClientCounts[m.id] = 0;
            }
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

        // generate 4-digit account number unique (simple attempt)
        let conta: string;
        const existingContas = new Set(clients.map((c) => c.conta));
        do {
            conta = Math.floor(1000 + Math.random() * 9000).toString();
        } while (existingContas.has(conta));

        client.limite = limit;
        client.manager = chosen;
        client.conta = conta;
        client.agencia = '0001';
        client.saldo = 0;

        // Add to official clients list
        const updatedClients = [...clients, client];
        this.saveClients(updatedClients);

        // Remove from pending
        pending.splice(idx, 1);
        this.savePending(pending);

        // simulate sending email with random password (not stored here)
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
        const idx = pending.findIndex((c) => c.id === clientId);
        if (idx === -1) {
            return {
                ok: false,
                message: 'Cliente não encontrado nos pendentes.',
            };
        }
        const client = pending[idx];
        pending.splice(idx, 1);
        this.savePending(pending);
        console.log(
            `[REJEICAO] Cliente ${client.nome} rejeitado. Motivo: ${reason}`
        );
        return { ok: true, message: 'Cliente rejeitado e removido.' };
    }
}
