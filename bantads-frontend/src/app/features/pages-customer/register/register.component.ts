import confetti from 'canvas-confetti';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import Swal from 'sweetalert2';

import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Cliente, EnderecoCliente } from '../../models/cliente.model';
import { UserService } from '../../services/user/user.service';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, FormsModule, NgxMaskDirective, RouterLink],
    providers: [provideNgxMask()],
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.css'],
})
export class RegisterComponent {
    constructor(private userService: UserService, private router: Router) {}

    @ViewChild('registerForm') registerForm!: NgForm | undefined;
    message: string = '';
    currentStep: number = 1;
    isEmailAvailable: boolean = true;
    isUserAvailable: boolean = true;
    isCepValid: boolean = true;
    client: Cliente | undefined;

    onSubmit() {
        this.message = ''; // Reseta a mensagem ao submeter o formulário

        if (this.isCepValid === false) {
            this.message =
                'CEP inválido. Por favor, verifique o CEP informado.';
            Swal.fire({
                icon: 'warning',
                title: 'Erro',
                text: this.message,
                confirmButtonText: 'OK',
            });
            return;
        }

        if (this.registerForm?.valid) {
            this.client = this.verifyFieldsAndCreateCliente() as Cliente;
            if (!this.client) {
                return;
            }

            this.userService.createUser(this.client).subscribe({
                next: (response) => {
                    if (response) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Cadastro realizado com sucesso!',
                            text: 'O seu cadastro será enviado para aprovação por um gerente da sua região antes de poder acessar o sistema.',
                            confirmButtonText: 'OK',
                        });

                        this.launchConfetti();
                        this.router.navigate(['/login']);
                    } else {
                        this.message =
                            'Erro ao fazer cadastro. Verifique sua conexão ou tente novamente mais tarde.';
                        Swal.fire({
                            icon: 'error',
                            title: 'Erro',
                            text: this.message,
                            confirmButtonText: 'OK',
                        });
                    }
                },
                error: (err) => {
                    this.message =
                        'Ocorreu um erro ao fazer o cadastro. Erro: ' +
                        (err.error?.message || 'Erro desconhecido.');
                    Swal.fire({
                        icon: 'error',
                        title: 'Erro',
                        text: this.message,
                        confirmButtonText: 'OK',
                    });
                },
            });
        } else {
            this.message = 'Preencha todos os campos obrigatórios.';
            Swal.fire({
                icon: 'warning',
                title: 'Atenção',
                text: this.message,
                confirmButtonText: 'OK',
            });
        }
    }

    launchConfetti() {
        confetti({
            particleCount: 500,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#ff0000', '#00ff00', '#0000ff'],
            zIndex: 1060,
        });
    }

    verifyFieldsAndCreateCliente(): Cliente | null {
        if (!this.registerForm) return null;

        const formValues = this.registerForm.value;

        // Monta o objeto EnderecoCliente
        const endereco: EnderecoCliente = {
            tipo: formValues.tipo,
            logradouro: formValues.logradouro,
            bairro: formValues.bairro || '', // caso não tenha
            numero: formValues.numero,
            complemento: formValues.complemento || '',
            cep: formValues.cep.replace(/\D/g, ''),
            cidade: formValues.cidade,
            estado: formValues.estado,
        };

        // Monta o objeto Cliente
        const cliente: Cliente = {
            id: '', // será gerado pelo backend
            nome: formValues.nome,
            email: formValues.email,
            cpf: formValues.cpf.replace(/\D/g, ''), // não pode ser alterado
            telefone: formValues.telefone.replace(/\D/g, ''),
            salario: +formValues.salario,
            limite: +formValues.salario * 2, // exemplo de cálculo
            saldo: 0, // saldo inicial
            manager: formValues.manager, // selecionado pelo usuário ou padrão
            endereco: endereco,
            agencia: '', // será gerada pelo sistema
            conta: '', // será gerada pelo sistema
            criadoEm: new Date().toISOString(),
        };

        return cliente;
    }

    goToNextStep(): void {
        if (this.currentStep < 2) {
            this.currentStep++;
        }
    }

    goToPreviousStep(): void {
        if (this.currentStep > 1) {
            this.currentStep--;
        }
    }

    // Verifica se o cep é válido
    onVerifyCep(): void {
        const cep = this.registerForm?.controls['cep']?.value || '';

        // Verifica se o CEP tem 8 dígitos
        const cepPattern = /^\d{5}-?\d{3}$/;
        if (!cepPattern.test(cep)) {
            this.isCepValid = false;
            return;
        }

        // Busca as informações do CEP
        this.userService.validateCep(cep.replace('-', '')).subscribe({
            next: (address) => {
                if (address) {
                    // Se o CEP for válido, preenche os campos de endereço
                    if (this.registerForm && this.registerForm.controls) {
                        this.registerForm.controls['logradouro']?.setValue(
                            address.logradouro
                        );
                        this.registerForm.controls['bairro']?.setValue(
                            address.bairro
                        );
                        this.registerForm.controls['cidade']?.setValue(
                            address.cidade
                        );
                        this.registerForm.controls['estado']?.setValue(
                            address.estado
                        );
                        this.registerForm.controls['complemento']?.setValue(
                            address.complemento || ''
                        );
                    }
                    this.isCepValid = true; // CEP válido
                    console.log('CEP válido:', address);
                } else {
                    this.message = 'CEP não encontrado.';
                    Swal.fire({
                        icon: 'warning',
                        title: 'Erro',
                        text: this.message,
                        confirmButtonText: 'OK',
                    });
                    this.isCepValid = false; // CEP inválido
                    this.registerForm?.controls['cep']?.setValue(''); // Reseta o campo de CEP
                }
            },
            error: (err) => {
                const status = err?.status;
                console.log('status: ', status);
                if ((status >= 500 && status < 600) || status === 0) {
                    // Permite continuar mesmo com erro 500
                    this.message =
                        'Erro ao consultar o CEP, mas você pode continuar preenchendo os dados.';
                    Swal.fire({
                        icon: 'info',
                        title: 'Atenção',
                        text: this.message,
                        confirmButtonText: 'OK',
                    });
                    this.isCepValid = true; // Permite seguir
                } else {
                    // Outros erros
                    this.message =
                        err.message ||
                        'Erro ao buscar CEP. Verifique sua conexão ou tente novamente mais tarde.';
                    Swal.fire({
                        icon: 'error',
                        title: 'Erro',
                        text: this.message,
                        confirmButtonText: 'OK',
                    });
                    this.isCepValid = false;
                    this.registerForm?.controls['cep']?.setValue('');
                }
            },
        });
    }

    onValidateEmail(): void {
        this.userService
            .verifyEmailAvailability(
                this.registerForm?.controls['email']?.value || ''
            )
            .subscribe({
                next: (available) => {
                    this.isEmailAvailable = available;
                    if (!available) {
                        this.message =
                            'E-mail já cadastrado. Por favor, utilize outro e-mail.';
                        Swal.fire({
                            icon: 'warning',
                            title: 'Atenção',
                            text: this.message,
                            confirmButtonText: 'OK',
                        });

                        this.registerForm?.controls['email']?.setValue(''); // Reseta o campo de e-mail
                    } else {
                        this.message = '';
                    }
                },
                error: (err) => {
                    this.message =
                        'Erro ao verificar e-mail. Verifique sua conexão ou tente novamente mais tarde.';
                    Swal.fire({
                        icon: 'error',
                        title: 'Erro',
                        text: this.message,
                        confirmButtonText: 'OK',
                    });
                    this.registerForm?.controls['email']?.setValue(''); // Reseta o campo de e-mail
                },
            });
    }

    onValidateUser(): void {
        this.userService
            .verifyUserByCpf(this.registerForm?.controls['cpf']?.value || '')
            .subscribe({
                next: (exists) => {
                    this.isUserAvailable = !exists;
                    if (exists) {
                        this.message =
                            'CPF já cadastrado. Por favor, utilize outro CPF.';
                        Swal.fire({
                            icon: 'warning',
                            title: 'Atenção',
                            text: this.message,
                            confirmButtonText: 'OK',
                        });
                        this.registerForm?.controls['cpf']?.setValue(''); // Reseta o campo de CPF
                    } else {
                        this.message = '';
                    }
                },
                error: (err) => {
                    this.message =
                        'Erro ao verificar CPF. Verifique sua conexão ou tente novamente mais tarde.';
                    Swal.fire({
                        icon: 'error',
                        title: 'Erro',
                        text: this.message,
                        confirmButtonText: 'OK',
                    });

                    this.registerForm?.controls['cpf']?.setValue(''); // Reseta o campo de CPF
                },
            });
    }
}
