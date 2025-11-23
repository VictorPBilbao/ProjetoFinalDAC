import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';

import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Record as ContaRecord } from '../../models/record.model';
import { Transaction } from '../../models/transaction.model';
import { AuthService } from '../auth/auth.service';

const API_URL = 'http://localhost:3000';

@Injectable({ providedIn: 'root' })
export class ServiceContaService {
    constructor(private http: HttpClient, private authService: AuthService) {}

    getMinhaConta(cpfParam?: string): Observable<any> {
        const token = this.authService.getToken();
        const loggedUser = this.authService.getUser();
        const cpf = cpfParam || loggedUser?.cpf;

        if (!cpf) {
            return throwError(
                () =>
                    new Error(
                        'CPF não encontrado e/ou usuário não está logado.'
                    )
            );
        }

        const headers = token
            ? new HttpHeaders().set('Authorization', token)
            : new HttpHeaders();
        return this.http.get(`${API_URL}/clientes/${cpf}`, { headers });
    }

    depositar(numeroConta: string, valor: number): Observable<any> {
        const token = this.authService.getToken();
        const headers = token
            ? new HttpHeaders().set('Authorization', token)
            : new HttpHeaders();
        console.log(`Depositando na conta ${numeroConta}`);
        return this.http.post(
            `${API_URL}/contas/${numeroConta}/depositar`,
            {
                valor: valor,
            },
            { headers }
        );
    }

    sacar(numeroConta: string, valor: number): Observable<any> {
        const token = this.authService.getToken();
        const headers = token
            ? new HttpHeaders().set('Authorization', token)
            : new HttpHeaders();
        return this.http.post(
            `${API_URL}/contas/${numeroConta}/sacar`,
            {
                valor: valor,
            },
            { headers }
        );
    }

    transferir(
        numeroContaOrigem: string,
        numeroContaDestino: string,
        valor: number
    ): Observable<any> {
        const token = this.authService.getToken();
        const headers = token
            ? new HttpHeaders().set('Authorization', token)
            : new HttpHeaders();
        return this.http.post(
            `${API_URL}/contas/${numeroContaOrigem}/transferir`,
            {
                destino: numeroContaDestino,
                valor: valor,
            },
            { headers }
        );
    }

    getStatement(
        numeroConta: string,
        inicio?: string,
        fim?: string
    ): Observable<ContaRecord[]> {
        let params = new HttpParams();
        if (inicio) params = params.set('startDate', inicio);
        if (fim) params = params.set('endDate', fim);

        const token = this.authService.getToken();
        const headers = token
            ? new HttpHeaders().set('Authorization', token)
            : new HttpHeaders();

        return this.http
            .get<any>(`${API_URL}/contas/${numeroConta}/extrato`, {
                params,
                headers,
            })
            .pipe(
                map((respostaBackend) => {
                    if (!respostaBackend || !respostaBackend.movimentacoes) {
                        return [];
                    }

                    const agrupadoPorDia: { [key: string]: any } = {};

                    respostaBackend.movimentacoes.forEach((mov: any) => {
                        const dataObj = new Date(mov.data);
                        const dataKey = dataObj.toLocaleDateString('pt-BR');

                        if (!agrupadoPorDia[dataKey]) {
                            agrupadoPorDia[dataKey] = {
                                date: dataObj,
                                transactions: [],
                                consolidatedBalance: 0,
                            };
                        }

                        agrupadoPorDia[dataKey].transactions.push(
                            this.mapToTransaction(mov)
                        );
                    });

                    return Object.values(agrupadoPorDia);
                })
            );
    }
    private mapToTransaction(mov: any): Transaction {
        let op: 'Transferencia' | 'Deposito' | 'Saque' = 'Transferencia';
        const tipo = (mov.operacao || '').toUpperCase();

        if (tipo.includes('DEPOSITO')) op = 'Deposito';
        else if (tipo.includes('SAQUE')) op = 'Saque';

        return {
            id: '',
            clientId: '',
            dateTime: new Date(mov.dataHora),
            operation: op,
            fromOrToClient: mov.origem || mov.destino,
            amount: mov.valor,
        };
    }
}
