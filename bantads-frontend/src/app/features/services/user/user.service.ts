import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { LoadingService } from '../utils/loading-service.service';
import { Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { EnderecoCliente } from '../../models/cliente.model';
import { delay } from 'rxjs/operators';
import { Cliente } from '../../models/cliente.model';
import { LocalStorageServiceService } from '../local-storages/local-storage-service.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(
    private http: HttpClient,
    private loadingService: LoadingService,
    private localStorageService: LocalStorageServiceService
  ) { }

   createUser(clienteData: Cliente): Observable<any> {
    console.log('Dados recebidos para criar usuário:', clienteData);

    // Monta o novo cliente com dados calculados
    const newCliente: Cliente = {
      ...clienteData,
      id: Date.now().toString(), // ou uuid
      saldo: 0,
      limite: clienteData.salario * 2,
      criadoEm: new Date().toISOString()
    };

    // Salva de verdade no localStorage
    this.localStorageService.addCliente(newCliente);

    // Simula resposta de API
    const fakeResponse = {
      success: true,
      message: 'Cliente criado com sucesso!',
      data: newCliente
    };

    return of(fakeResponse).pipe(delay(1000));
  }

  verifyUserByCpf(cpf: string): Observable<boolean> {
    const existingCliente = this.localStorageService.getClientes().find(c => c.cpf === cpf);
    return of(!!existingCliente).pipe(delay(500));
  }

  verifyEmailAvailability(email: string): Observable<boolean> {
    const existingCliente = this.localStorageService.getClientes().find(c => c.email === email);
    return of(!existingCliente).pipe(delay(500));
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
