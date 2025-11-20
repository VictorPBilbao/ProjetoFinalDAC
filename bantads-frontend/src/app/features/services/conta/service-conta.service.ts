import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Record as ContaRecord } from '../../models/record.model';
import { Transaction } from '../../models/transaction.model';

const API_URL = 'http://localhost:3000';

@Injectable({ providedIn: 'root' })
export class ServiceContaService {

  constructor(private http: HttpClient) { }

  getMinhaConta(): Observable<any> {
    return this.http.get(`${API_URL}/query/my-account`);
  }

  getStatement(numeroConta: string, inicio?: string, fim?: string): Observable<ContaRecord[]> {
    let params = new HttpParams();
    if (inicio) params = params.set('startDate', inicio);
    if (fim) params = params.set('endDate', fim);

    return this.http.get<any[]>(`${API_URL}/query/contas/${numeroConta}/extrato`, { params })
      .pipe(
        map((respostaBackend) => {
          return respostaBackend.map(dia => ({
            date: new Date(dia.data + 'T00:00:00'),
            consolidatedBalance: dia.saldoDoDia,
            transactions: dia.movimentacoes.map((mov: any) => this.mapToTransaction(mov))
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
      amount: mov.valor
    };
  }
}
