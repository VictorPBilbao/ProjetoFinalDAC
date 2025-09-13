import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { LoadingService } from '../utils/loading-service.service';
import { Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { EnderecoCliente } from '../../models/cliente.model';
import { delay } from 'rxjs/operators';
import { Cliente } from '../../models/cliente.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(
    private http: HttpClient,
    private loadingService: LoadingService
  ) { }

   createUser(clienteData: Cliente): Observable<any> {
    console.log('Dados recebidos para criar usuário:', clienteData);

    // Simula resposta da API após 1 segundo
    const fakeResponse = {
      success: true,
      message: 'Cliente criado com sucesso!',
      data: {
        ...clienteData,
        id: '12345',           // ID gerado pelo backend
        saldo: 0,              // saldo inicial
        limite: clienteData.salario * 2, // exemplo de limite
        criadoEm: new Date().toISOString()
      }
    };

    return of(fakeResponse).pipe(delay(1000)); // simula tempo de requisição
  }

  // valid o cep do usuário
  validateCep(cep: string): Observable<EnderecoCliente> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    this.loadingService.show(); // Exibe o loading

    return this.http
      .get<any>(`https://viacep.com.br/ws/${cep}/json/`, { headers })
      .pipe(
        map((data) => {
          if (data.erro) {
            throw new Error('CEP inválido');
          }
          return this.mapToPersonAddress(data);
        }),
        finalize(() => this.loadingService.hide()), // Esconde o loading após a requisição
        catchError((err) => {
          // Preserve o erro original
          return throwError(() => err);
        })
      );
  }

  mapToPersonAddress(data: any): EnderecoCliente {
    console.log('Dados do CEP:', data);
    return {
      tipo: 'cliente',
      cep: data.cep,
      numero: '',
      logradouro: data.logradouro,
      bairro: data.bairro,
      complemento: data.complemento || '',
      cidade: data.localidade,
      estado: data.uf
    };
  }
}
