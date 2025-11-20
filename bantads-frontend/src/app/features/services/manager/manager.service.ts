import { Injectable } from '@angular/core';
import { Cliente } from '../../models/cliente.model';
import { Manager } from '../../models/manager.model';
import {
    LocalStorageServiceService,
    RejectedClient,
} from '../../services/local-storages/local-storage-service.service';
import { AuthService } from '../auth/auth.service';
import { LoadingService } from '../utils/loading-service.service';
import { Observable, of } from 'rxjs';
import { catchError, delay, finalize } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ManagerService {
    constructor(
        private readonly storage: LocalStorageServiceService,
        private readonly authService: AuthService,
        private readonly loadingService: LoadingService,
        private http: HttpClient
    ) { }

    private apiUrl = 'http://localhost:3000';

    getManagersWithTotals(): Observable<Manager[]> {
        this.loadingService.show();
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

        this.loadingService.hide();
        return of(managers).pipe(delay(500));
    }

    getPending(): Cliente[] {
        this.loadingService.show();
        try {
            return this.storage.getClientesPendentes();
        } finally {
            this.loadingService.hide();
        }
    }

    approve(clientId: string): { ok: boolean; message: string } {
        this.loadingService.show();
        const pending = this.getPending();
        const client = pending.find((c) => c.id === clientId);
        if (!client) {
            return {
                ok: false,
                message: 'Cliente não encontrado nos pendentes.',
            };
        }

        const currentUser = this.authService.getUser();
        if (!currentUser || currentUser.tipo !== 'gerente') {
            this.loadingService.hide();
            return {
                ok: false,
                message: 'Ação permitida apenas para gerentes autenticados.'
            };
        }

        const managers = this.storage.getManagers();
        const approvingManager = managers.find(
            (m) => m.email === ""
        );

        if (!approvingManager) {
            this.loadingService.hide();
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

        this.loadingService.hide();
        return { ok: true, message: 'Cliente aprovado com sucesso.' };
    }

    reject(clientId: string, reason: string): { ok: boolean; message: string } {
        this.loadingService.show();
        if (!reason?.trim()) {
            return { ok: false, message: 'Motivo é obrigatório.' };
        }

        const pending = this.getPending();
        const cliente = pending.find((c) => c.id === clientId);
        if (!cliente) {
            this.loadingService.hide();
            return {
                ok: false,
                message: 'Cliente não encontrado nos pendentes.',
            };
        }

        // Get current logged manager
        const currentUser = this.authService.getUser();
        if (!currentUser) {
            this.loadingService.hide();
            return {
                ok: false,
                message: 'Usuário não autenticado.',
            };
        }

        // Find manager by email
        const managers = this.storage.getManagers();
        const currentManager = managers.find(
            (m) => m.email === ""
        );
        if (!currentManager) {
            this.loadingService.hide();
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

            this.loadingService.hide();
            return {
                ok: true,
                message: `Cliente ${cliente.nome} foi rejeitado e removido da lista. Email de notificação enviado.`,
            };
        } catch (error) {
            console.error('Erro ao rejeitar cliente:', error);
            this.loadingService.hide();
            return {
                ok: false,
                message: 'Erro interno ao processar rejeição.',
            };
        }
    }

    // ---------------- CREATE ----------------
    createManager(manager: Manager): Observable<any> {
        this.loadingService.show();

        const token = this.authService.getToken();
        const payload = {
            cpf: manager.cpf,
            nome: manager.name,
            email: manager.email,
            senha: manager.password,
            telefone: manager.telephone,
            tipo: "GERENTE"
        }

        return this.http.post<any>(
            `${this.apiUrl}/gerentes`,
            payload,
            {
                headers: token ? { Authorization: token } : {}
            }
        ).pipe(
            catchError(err => {
                // Aqui você captura o erro vindo do backend
                console.error('Erro ao criar gerente:', err);

                // Se o backend devolveu SagaResult, você pode repassar a mensagem
                const errorMsg = err.error?.message || 'Erro inesperado ao criar gerente';
                return of({ success: false, message: errorMsg, detail: err.error });
            }),
            finalize(() => this.loadingService.hide())
        );
    }

    verifyManagerByCPF(cpf: string): Observable<{ exists: boolean }> {
        const exists = this.storage.getManagers().some((m) => m.cpf === cpf);
        return of({ exists }).pipe(delay(500));
    }

    // ---------------- READ ----------------
    getManagers(): Observable<Manager[]> {
        this.loadingService.show();
        const token = this.authService.getToken();
        return this.http.get<Manager[]>(`${this.apiUrl}/gerentes`, {
            headers: token ? { Authorization: token } : {}
        }).pipe(
            catchError(err => {
                console.error('Erro ao buscar gerentes:', err);
                return of([]);
            }),
            finalize(() => this.loadingService.hide())
        );
    }

    getManagerById(managercpf: string): Observable<Manager | undefined> {
        this.loadingService.show();
        const token = this.authService.getToken();
        return this.http.get<Manager>(`${this.apiUrl}/gerentes/${managercpf}`, {
            headers: token ? { Authorization: token } : {}
        }).pipe(
            catchError(err => {
                console.error('Erro ao buscar gerente por ID:', err);
                return of(undefined);
            }),
            finalize(() => this.loadingService.hide())
        );
    }

    // ---------------- UPDATE ----------------
    updateManager(updated: Manager): Observable<any> {
        this.loadingService.show();
        const token = this.authService.getToken();
        console.log('Atualizando gerente:', updated);
        const payload = {
            cpf: updated.cpf,
            nome: updated.name,
            email: updated.email,
            senha: updated.password,
            telefone: updated.telephone,
            tipo: "GERENTE"
        }

        return this.http.put<any>(
            `${this.apiUrl}/gerentes/${updated.cpf}`,
            payload,
            {
                headers: token ? { Authorization: token } : {}
            }
        ).pipe(
            catchError(err => {
                console.error('Erro ao atualizar gerente:', err);
                const errorMsg = err.error?.message || 'Erro inesperado ao atualizar gerente';
                return of({ success: false, message: errorMsg, detail: err.error });
            }
            ),
            finalize(() => this.loadingService.hide())
        );
    }

    // ---------------- DELETE ----------------
    deleteManager(managercpf: string): Observable<any> {
        this.loadingService.show();

        const token = this.authService.getToken();

        return this.http.delete<any>(
            `${this.apiUrl}/gerentes/${managercpf}`,
            {
            headers: token ? { Authorization: token } : {}
            }
        ).pipe(
            catchError(err => {
            console.error('Erro ao deletar gerente:', err);
            const errorMsg = err.error?.message || 'Erro inesperado ao deletar gerente';
            return of({ success: false, message: errorMsg, detail: err.error });
            }),
            finalize(() => this.loadingService.hide())
        );
    }

    // ---------------- REJECTED CLIENTS ----------------
    getRejectedClients(): Observable<RejectedClient[]> {
        const rejectedClients = this.storage.getRejectedClients();
        return of(rejectedClients).pipe(delay(500));
    }
}
