import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { Cliente } from '../../models/cliente.model';
import { AuthService } from '../auth/auth.service';

@Injectable({
    providedIn: 'root',
})
export class ClientService {
    private readonly apiUrl = 'http://localhost:3000';

    constructor(private http: HttpClient, private authService: AuthService) {}

    getClients(search?: string): Observable<Cliente[]> {
        let params = new HttpParams();
        if (search) {
            params = params.set('busca', search);
        }

        return this.http.get<any[]>(`${this.apiUrl}/clientes`, { params }).pipe(
            map((response) =>
                response.map((item) => this.mapToClientModel(item))
            ),
            catchError((err) => {
                console.error('Erro ao buscar clientes:', err);
                return of([]);
            })
        );
    }

    getClientById(cpf: string): Observable<Cliente | undefined> {
        const endpoint = `${this.apiUrl}/relatorio/cliente-detalhado/${cpf}`;

        return this.http.get<any>(endpoint).pipe(
            map((dto) => this.mapToClientModel(dto)),
            catchError((err) => {
                console.error('Erro ao buscar detalhe do cliente:', err);
                return of(undefined);
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
        return this.http.post(`${this.apiUrl}/clientes`, newClient).pipe(
            catchError((err) => {
                console.error('Erro no cadastro:', err);
                return throwError(() => err);
            })
        );
    }

    updateClient(updatedClient: Cliente): Observable<any> {
        const cpf = updatedClient.cpf;
        return this.http
            .put(`${this.apiUrl}/clientes/${cpf}`, updatedClient)
            .pipe(
                catchError((err) => {
                    console.error('Erro ao atualizar:', err);
                    return throwError(() => err);
                })
            );
    }

    deleteClient(cpf: string): Observable<any> {
        return this.http
            .delete(`${this.apiUrl}/clientes/${cpf}`)
            .pipe(catchError((err) => throwError(() => err)));
    }

    getLastAccess(): string {
        return new Date().toLocaleString('pt-BR');
    }

    private mapToClientModel(data: any): Cliente {
        if (!data) return {} as Cliente;

        const contaData = data.conta || {};
        const gerenteData = data.gerente || {};
        const enderecoData = data.endereco || {};

        return {
            id: data.id || data.cpf,
            cpf: data.cpf,
            nome: data.nome,
            email: data.email,
            telefone: data.telefone,
            salario: data.salario,

            endereco: {
                tipo: enderecoData.tipo || data.tipoLogradouro || '',
                logradouro: enderecoData.logradouro || data.logradouro || '',
                numero: enderecoData.numero || data.numero || '',
                complemento: enderecoData.complemento || data.complemento || '',
                cep: enderecoData.cep || data.cep || '',
                cidade: enderecoData.cidade || data.cidade || '',
                estado: enderecoData.estado || data.estado || '',
            },

            cidade: data.cidade || enderecoData.cidade,
            estado: data.estado || enderecoData.estado,

            conta: data.numeroConta || contaData.numero || contaData.conta,
            saldo: data.saldo !== undefined ? data.saldo : contaData.saldo || 0,
            limite:
                data.limite !== undefined ? data.limite : contaData.limite || 0,

            manager: {
                cpf: data.cpfGerente || gerenteData.cpf,
                name: data.nomeGerente || data.gerenteName || 'Não Atribuído',
            },

            criadoEm: data.criadoEm,
        } as any as Cliente;
    }
}
