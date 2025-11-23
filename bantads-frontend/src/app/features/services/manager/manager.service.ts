import { Observable, of } from 'rxjs';
import { catchError, delay, finalize, map } from 'rxjs/operators';

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Cliente } from '../../models/cliente.model';
import { Manager } from '../../models/manager.model';
import {
    LocalStorageServiceService,
    RejectedClient,
} from '../../services/local-storages/local-storage-service.service';
import { AuthService } from '../auth/auth.service';
import { LoadingService } from '../utils/loading-service.service';

@Injectable({ providedIn: 'root' })
export class ManagerService {
    private readonly apiUrl = 'http://localhost:3000';

    constructor(
        private readonly storage: LocalStorageServiceService,
        private readonly authService: AuthService,
        private readonly loadingService: LoadingService,
        private readonly http: HttpClient
    ) {}

    getManagersWithTotals(): Observable<Manager[]> {
        this.loadingService.show();
        const token = this.authService.getToken();

        return this.http
            .get<any[]>(`${this.apiUrl}/gerentes?filtro=dashboard`, {
                headers: token ? { Authorization: token } : {},
            })
            .pipe(
                map((response) => {
                    return response.map((item) => {
                        return {
                            id: item.gerente.id || item.gerente.cpf,
                            name: item.gerente.nome,
                            cpf: item.gerente.cpf,
                            email: item.gerente.email,
                            telephone: item.gerente.telefone,

                            clientCount: item.clientes
                                ? item.clientes.length
                                : 0,
                            positiveTotal: item.saldo_positivo,
                            negativeTotal: item.saldo_negativo,
                        } as Manager;
                    });
                }),
                catchError((err) => {
                    console.error('Erro ao buscar dashboard de gerentes:', err);
                    return of([]);
                }),
                finalize(() => this.loadingService.hide())
            );
    }

    getBestClients(): Observable<Cliente[]> {
        this.loadingService.show();
        const token = this.authService.getToken();

        return this.http
            .get<any[]>(`${this.apiUrl}/clientes?filtro=melhores_clientes`, {
                headers: token ? { Authorization: token } : {},
            })
            .pipe(
                map((response) => {
                    return response.map((item) => {
                        return {
                            id: item.cpf,
                            cpf: item.cpf,
                            nome: item.nome,
                            saldo: Number(item.saldo),
                            endereco: {
                                cidade: item.cidade || 'N/A',
                                estado: item.estado || 'UF',
                            },
                        } as Cliente;
                    });
                }),
                catchError((err) => {
                    console.error('Erro ao buscar melhores clientes:', err);
                    return of([]);
                }),
                finalize(() => this.loadingService.hide())
            );
    }

    getPending(): Observable<Cliente[]> {
        this.loadingService.show();
        const token = this.authService.getToken();

        return this.http
            .get<any[]>(`${this.apiUrl}/clientes?filtro=para_aprovar`, {
                headers: token ? { Authorization: token } : {},
            })
            .pipe(
                map((response) => {
                    if (!Array.isArray(response)) return [];
                    return response.map(
                        (item) =>
                            ({
                                id: item.cpf,
                                cpf: item.cpf,
                                nome: item.nome,
                                email: item.email,
                                telefone: item.telefone,
                                salario: Number(item.salario || 0),
                                limite: 0,
                                saldo: 0,
                                manager: {} as any,
                                agencia: '',
                                conta: '',
                                endereco: {
                                    tipo: item.tipo || '',
                                    logradouro: item.endereco || '',
                                    bairro: item.bairro || '',
                                    numero: item.numero || '',
                                    complemento: item.complemento || '',
                                    cep: item.cep || '',
                                    cidade: item.cidade || '',
                                    estado: item.estado || '',
                                },
                                criadoEm:
                                    item.dataCadastro ||
                                    new Date().toISOString(),
                                aprovado: false,
                            } as Cliente)
                    );
                }),
                catchError((err) => {
                    console.error('Erro ao buscar clientes pendentes:', err);
                    return of([]);
                }),
                finalize(() => this.loadingService.hide())
            );
    }

    approve(cpf: string): Observable<{ ok: boolean; message: string }> {
        this.loadingService.show();
        const token = this.authService.getToken();

        return this.http
            .post<any>(
                `${this.apiUrl}/clientes/${cpf}/aprovar`,
                {},
                {
                    headers: token ? { Authorization: token } : {},
                }
            )
            .pipe(
                map((response) => ({
                    ok: true,
                    message:
                        response?.message || 'Cliente aprovado com sucesso!',
                })),
                catchError((err) => {
                    console.error('Erro ao aprovar cliente:', err);
                    const errorMsg =
                        err.error?.message ||
                        err.error?.erro ||
                        'Erro ao aprovar cliente';
                    return of({
                        ok: false,
                        message: errorMsg,
                    });
                }),
                finalize(() => this.loadingService.hide())
            );
    }

    reject(
        cpf: string,
        reason: string
    ): Observable<{ ok: boolean; message: string }> {
        this.loadingService.show();

        if (!reason?.trim()) {
            this.loadingService.hide();
            return of({ ok: false, message: 'Motivo é obrigatório.' });
        }

        const token = this.authService.getToken();

        return this.http
            .post<any>(
                `${this.apiUrl}/clientes/${cpf}/rejeitar`,
                { motivo: reason },
                {
                    headers: token ? { Authorization: token } : {},
                }
            )
            .pipe(
                map((response) => ({
                    ok: true,
                    message:
                        response?.message || 'Cliente rejeitado com sucesso!',
                })),
                catchError((err) => {
                    console.error('Erro ao rejeitar cliente:', err);
                    const errorMsg =
                        err.error?.message ||
                        err.error?.erro ||
                        'Erro ao rejeitar cliente';
                    return of({
                        ok: false,
                        message: errorMsg,
                    });
                }),
                finalize(() => this.loadingService.hide())
            );
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
            tipo: 'GERENTE',
        };

        return this.http
            .post<any>(`${this.apiUrl}/gerentes`, payload, {
                headers: token ? { Authorization: token } : {},
            })
            .pipe(
                catchError((err) => {
                    // Aqui você captura o erro vindo do backend
                    console.error('Erro ao criar gerente:', err);

                    // Se o backend devolveu SagaResult, você pode repassar a mensagem
                    const errorMsg =
                        err.error?.message ||
                        'Erro inesperado ao criar gerente';
                    return of({
                        success: false,
                        message: errorMsg,
                        detail: err.error,
                    });
                }),
                finalize(() => this.loadingService.hide())
            );
    }

    verifyManagerByCPF(cpf: string): Observable<{ exists: boolean }> {
        return this.getManagerById(cpf).pipe(
            map((manager) => ({ exists: !!manager })),
            catchError(() => of({ exists: false }))
        );
    }

    // ---------------- READ ----------------
    getManagers(): Observable<Manager[]> {
        this.loadingService.show();
        const token = this.authService.getToken();
        return this.http
            .get<Manager[]>(`${this.apiUrl}/gerentes`, {
                headers: token ? { Authorization: token } : {},
            })
            .pipe(
                catchError((err) => {
                    console.error('Erro ao buscar gerentes:', err);
                    return of([]);
                }),
                finalize(() => this.loadingService.hide())
            );
    }

    getManagerById(managercpf: string): Observable<Manager | undefined> {
        this.loadingService.show();
        const token = this.authService.getToken();
        return this.http
            .get<Manager>(`${this.apiUrl}/gerentes/${managercpf}`, {
                headers: token ? { Authorization: token } : {},
            })
            .pipe(
                catchError((err) => {
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
            tipo: 'GERENTE',
        };

        return this.http
            .put<any>(`${this.apiUrl}/gerentes/${updated.cpf}`, payload, {
                headers: token ? { Authorization: token } : {},
            })
            .pipe(
                catchError((err) => {
                    console.error('Erro ao atualizar gerente:', err);
                    const errorMsg =
                        err.error?.message ||
                        'Erro inesperado ao atualizar gerente';
                    return of({
                        success: false,
                        message: errorMsg,
                        detail: err.error,
                    });
                }),
                finalize(() => this.loadingService.hide())
            );
    }

    // ---------------- DELETE ----------------
    deleteManager(managercpf: string): Observable<any> {
        this.loadingService.show();

        const token = this.authService.getToken();

        return this.http
            .delete<any>(`${this.apiUrl}/gerentes/${managercpf}`, {
                headers: token ? { Authorization: token } : {},
            })
            .pipe(
                catchError((err) => {
                    console.error('Erro ao deletar gerente:', err);
                    const errorMsg =
                        err.error?.message ||
                        'Erro inesperado ao deletar gerente';
                    return of({
                        success: false,
                        message: errorMsg,
                        detail: err.error,
                    });
                }),
                finalize(() => this.loadingService.hide())
            );
    }

    getRejectedClients(): Observable<RejectedClient[]> {
        const token = this.authService.getToken();

        return this.http
            .get<any[]>(`${this.apiUrl}/clientes`, {
                headers: token ? { Authorization: token } : {},
            })
            .pipe(
                map((clientes) => {
                    const rejeitados = clientes.filter(
                        (c) => c.status === 'REJEITADO'
                    );
                    return rejeitados as RejectedClient[];
                }),
                catchError((err) => {
                    console.error('Erro ao buscar clientes rejeitados:', err);
                    return of([]);
                })
            );
    }
}
