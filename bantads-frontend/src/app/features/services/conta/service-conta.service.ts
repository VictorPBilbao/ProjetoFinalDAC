import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Record as ContaRecord } from '../../models/record.model';
import { Transaction } from '../../models/transaction.model';
import { AuthService } from '../auth/auth.service';

const API_URL = 'http://localhost:3000';

@Injectable({ providedIn: 'root' })
export class ServiceContaService {
    constructor(private http: HttpClient, private authService: AuthService) {}

    getMinhaConta(): Observable<any> {
        const token = this.authService.getToken();
        const headers = token ? new HttpHeaders().set('Authorization', token) : new HttpHeaders();
        return this.http.get(`${API_URL}/query/my-account`, { headers });
    }

    depositar(numeroConta: string, valor: number): Observable<any> {
        const token = this.authService.getToken();
        const headers = token ? new HttpHeaders().set('Authorization', token) : new HttpHeaders();
        return this.http.post(`${API_URL}/contas/${numeroConta}/depositar`, {
            amount: valor,
        }, { headers });
    }

    sacar(numeroConta: string, valor: number): Observable<any> {
        const token = this.authService.getToken();
        const headers = token ? new HttpHeaders().set('Authorization', token) : new HttpHeaders();
        return this.http.post(`${API_URL}/contas/${numeroConta}/sacar`, {
            amount: valor,
        }, { headers });
    }

    transferir(
        numeroContaOrigem: string,
        numeroContaDestino: string,
        valor: number
    ): Observable<any> {
        const token = this.authService.getToken();
        const headers = token ? new HttpHeaders().set('Authorization', token) : new HttpHeaders();
        return this.http.post(
            `${API_URL}/contas/${numeroContaOrigem}/transferir`,
            {
                destinationAccountNumber: numeroContaDestino,
                amount: valor,
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
        const headers = token ? new HttpHeaders().set('Authorization', token) : new HttpHeaders();

        return this.http
            .get<any[]>(`${API_URL}/query/contas/${numeroConta}/extrato`, {
                params,
                headers,
            })
            .pipe(
                map((respostaBackend) => {
                    return respostaBackend.map((dia) => ({
                        date: new Date(dia.data + 'T00:00:00'),
                        consolidatedBalance: dia.saldoDoDia,
                        transactions: dia.movimentacoes.map((mov: any) =>
                            this.mapToTransaction(mov)
                        ),
                    }));
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
