import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Cliente } from '../../models/cliente.model';
import { Manager } from '../../models/manager.model';
import { AuthService } from '../auth/auth.service';

@Injectable({
    providedIn: 'root',
})
export class ClientService {
    private readonly apiUrl = 'http://localhost:3000';

    constructor(private http: HttpClient, private authService: AuthService) {}

    getClients(search?: string, filter?: string): Observable<Cliente[]> {
        let params = new HttpParams();
        if (search) params = params.set('busca', search);
        if (filter) params = params.set('filtro', filter);

        const token = this.authService.getToken();
        let headers = new HttpHeaders();
        if (token) {
            headers = headers.set('Authorization', token);
        }

        return this.http
            .get<any[]>(`${this.apiUrl}/clientes`, { params, headers })
            .pipe(
                map((response) => {
                    if (!Array.isArray(response)) return [];
                    return response.map((item) => this.mapToClientModel(item));
                }),
                catchError((err) => {
                    console.error('Erro ao buscar clientes:', err);
                    return of([]);
                })
            );
    }

    getClientById(cpf: string): Observable<Cliente | undefined> {
        const endpoint = `${this.apiUrl}/clientes/${cpf}`;

        const token = this.authService.getToken();
        let headers = new HttpHeaders();
        if (token) {
            headers = headers.set('Authorization', token);
        }

        return this.http.get<any>(endpoint, { headers }).pipe(
            map((data) => this.mapToClientModel(data)),
            catchError((err) => {
                console.error('Erro ao buscar cliente:', err);
                return of(undefined);
            })
        );
    }

    createClient(client: Cliente): Observable<Cliente> {
        const token = this.authService.getToken();
        let headers = new HttpHeaders();
        if (token) {
            headers = headers.set('Authorization', token);
        }

        return this.http
            .post<Cliente>(`${this.apiUrl}/clientes`, client, { headers })
            .pipe(
                catchError((err) => {
                    console.error('Erro ao criar cliente:', err);
                    return throwError(() => err);
                })
            );
    }

    getLoggedClient(): Observable<Cliente | undefined> {
        const user = this.authService.getUser();
        if (user && user.cpf) {
            return this.getClientById(user.cpf);
        }
        return of(undefined);
    }

    addClient(newClient: any): Observable<any> {
        const token = this.authService.getToken();
        let headers = new HttpHeaders();
        if (token) {
            headers = headers.set('Authorization', token);
        }

        return this.http
            .post(`${this.apiUrl}/clientes`, newClient, { headers })
            .pipe(catchError((err) => throwError(() => err)));
    }

    updateClient(cpf: string, updateData: any): Observable<any> {
        const token = this.authService.getToken();
        let headers = new HttpHeaders();
        if (token) {
            headers = headers.set('Authorization', token);
        }

        return this.http
            .put(`${this.apiUrl}/clientes/${cpf}`, updateData, { headers })
            .pipe(
                map((response) => {
                    if (response && typeof response === 'object') {
                        return this.mapToClientModel(response);
                    }
                    return response;
                }),
                catchError((err) => {
                    console.error('Erro ao atualizar cliente:', err);
                    return throwError(() => err);
                })
            );
    }

    deleteClient(cpf: string): Observable<any> {
        const token = this.authService.getToken();
        let headers = new HttpHeaders();
        if (token) {
            headers = headers.set('Authorization', token);
        }

        return this.http
            .delete(`${this.apiUrl}/clientes/${cpf}`, { headers })
            .pipe(catchError((err) => throwError(() => err)));
    }

    getLastAccess(): Date {
        return new Date();
    }

    private mapToClientModel(data: any): Cliente {
        if (!data) return {} as Cliente;

        const contaData = data.conta || {};
        const gerenteData = data.gerente || {};
        const enderecoData = data.endereco || {};

        let numeroConta = '';
        if (data.numeroConta) {
            numeroConta = data.numeroConta;
        } else if (
            typeof data.conta === 'string' ||
            typeof data.conta === 'number'
        ) {
            numeroConta = String(data.conta);
        } else if (contaData.numero || contaData.conta) {
            numeroConta = contaData.numero || contaData.conta;
        }

        return {
            id: data.id || data.cpf,
            cpf: data.cpf,
            nome: data.nome,
            email: data.email,
            telefone: data.telefone,
            salario: data.salario,

            endereco: {
                tipo: data.tipoLogradouro || enderecoData.tipo || '',
                logradouro: data.logradouro || enderecoData.logradouro || '',
                numero: data.numero || enderecoData.numero || '',
                complemento: data.complemento || enderecoData.complemento || '',
                cep: data.cep || enderecoData.cep || '',
                cidade: data.cidade || enderecoData.cidade || '',
                estado: data.estado || enderecoData.estado || '',
                bairro: data.bairro || enderecoData.bairro || '',
            },

            conta: numeroConta,
            saldo: data.saldo !== undefined ? data.saldo : contaData.saldo || 0,
            limite:
                data.limite !== undefined ? data.limite : contaData.limite || 0,
            agencia: data.agencia || '0001',
            criadoEm: data.criadoEm || new Date().toISOString(),

            manager: {
                cpf: data.cpfGerente || data.idGerente || gerenteData.cpf,
                nome:
                    data.nomeGerente ||
                    data.gerenteName ||
                    gerenteData.nome ||
                    'Não Atribuído',
                id: gerenteData.id || null,
                email: gerenteData.email || '',
                telephone: gerenteData.telefone || '',
            } as Manager,
        };
    }
}
