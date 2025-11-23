import { Observable, of, throwError } from 'rxjs';
import { catchError, delay, finalize, map } from 'rxjs/operators';

import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Cliente, EnderecoCliente } from '../../models/cliente.model';
import { LoadingService } from '../utils/loading-service.service';

@Injectable({
    providedIn: 'root',
})
export class UserService {
    private apiUrl = 'http://localhost:3000';

    constructor(
        private http: HttpClient,
        private loadingService: LoadingService
    ) {}

    createUser(clienteData: Cliente): Observable<any> {
        console.log('Dados recebidos para criar usuário:', clienteData);

        // Transforma os dados do frontend para o formato do backend
        const autocadastroRequest = {
            cpf: clienteData.cpf.replace(/[^\d]/g, ''), // Remove formatação
            nome: clienteData.nome,
            email: clienteData.email.trim().toLowerCase(),
            telefone: clienteData.telefone,
            salario: clienteData.salario,
            endereco: `${clienteData.endereco.logradouro}, ${
                clienteData.endereco.numero
            }${
                clienteData.endereco.complemento
                    ? ' - ' + clienteData.endereco.complemento
                    : ''
            }`,
            cep: clienteData.endereco.cep.replace(/[^\d]/g, ''), // Remove formatação
            cidade: clienteData.endereco.cidade,
            estado: clienteData.endereco.estado.toUpperCase(),
        };

        console.log('Dados enviados para o backend:', autocadastroRequest);

        this.loadingService.show();

        return this.http
            .post<any>(`${this.apiUrl}/clientes`, autocadastroRequest)
            .pipe(
                map((response) => {
                    console.log('Resposta do backend:', response);

                    return response;
                }),
                finalize(() => this.loadingService.hide()),
                catchError((error) => {
                    let errorMessage = 'Erro ao cadastrar cliente';
                    if (error.status === 409) {
                        errorMessage =
                            'Usuário já cadastrado (CPF ou e-mail já em uso).';
                    } else if (error.status === 400) {
                        errorMessage =
                            'Dados inválidos. Verifique os campos e tente novamente.';
                    } else if (error.status === 503) {
                        errorMessage =
                            'Serviço indisponível. Tente novamente mais tarde.';
                    }
                    return throwError(() => new Error(errorMessage));
                })
            );
    }

    verifyUserByCpf(cpf: string): Observable<boolean> {
        this.loadingService.show();

        // Remove formatação do CPF (apenas números)
        const cleanCpf = cpf.replace(/[^\d]/g, '');

        return this.http
            .post<{ exists: boolean }>(
                'http://localhost:3000/clientes/validate',
                { cpf: cleanCpf }
            )
            .pipe(
                map((response) => response.exists),
                finalize(() => this.loadingService.hide()),
                catchError((error) => {
                    console.error('Erro ao verificar CPF:', error);
                    return of(false);
                })
            );
    }

    verifyEmailAvailability(email: string): Observable<boolean> {
        this.loadingService.show();
        return this.http
            .post<{ exists: boolean }>(
                'http://localhost:3000/clientes/validateEmail',
                { email }
            )
            .pipe(
                map((response) => response.exists),
                finalize(() => this.loadingService.hide()),
                catchError((error) => {
                    console.error('Erro ao verificar email:', error);
                    return of(false);
                })
            );
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
            estado: data.uf,
        };
    }
}
