import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { Cliente } from '../../models/cliente.model';
import { AuthService } from '../../services/auth/auth.service';
import { ClientService } from '../../services/client/client.service';
import { UserService } from '../../services/user/user.service';

@Component({
    selector: 'app-user-details',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './user-details.component.html',
    styleUrl: './user-details.component.css',
})
export class UserDetailsComponent implements OnInit {
    cliente!: Cliente;
    form!: FormGroup;
    editMode = false;
    saved = false;
    limiteOriginal!: number;
    loading = true;
    saving = false;
    error: string | null = null;
    loadingCep = false;
    cepError: string | null = null;

    constructor(
        private readonly fb: FormBuilder,
        private readonly authService: AuthService,
        private readonly clientService: ClientService,
        private readonly userService: UserService
    ) {}

    ngOnInit() {
        this.loadUserData();
    }

    loadUserData() {
        this.loading = true;
        this.error = null;

        const loggedUser = this.authService.getUser();
        if (!loggedUser) {
            this.error = 'Usuário não encontrado. Faça login novamente.';
            this.loading = false;
            return;
        }

        // Buscar dados do cliente logado usando o CPF
        this.clientService.getLoggedClient().subscribe({
            next: (cliente) => {
                if (cliente) {
                    // Ensure client has all required fields with defaults if missing
                    this.cliente = {
                        ...cliente,
                        agencia: cliente.agencia || 'Pendente',
                        conta: cliente.conta || 'Pendente',
                        saldo: cliente.saldo || 0,
                        limite: cliente.limite || 0,
                        manager: cliente.manager || {
                            id: '',
                            name: 'Aguardando designação',
                            cpf: '',
                            email: '',
                            telephone: '',
                        },
                    };
                    this.buildForm();
                } else {
                    this.error = 'Dados do cliente não encontrados.';
                }
                this.loading = false;
            },
            error: (err) => {
                this.error = 'Erro ao carregar dados do cliente.';
                this.loading = false;
                console.error('Erro ao carregar cliente:', err);
            },
        });
    }

    private buildForm() {
        if (!this.cliente) return;

        this.form = this.fb.group({
            nome: [
                this.cliente.nome,
                [Validators.required, Validators.minLength(3)],
            ],
            email: [{ value: this.cliente.email, disabled: true }],
            cpf: [{ value: this.cliente.cpf, disabled: true }],
            telefone: [this.cliente.telefone, [Validators.required]],
            salario: [
                this.cliente.salario,
                [Validators.required, Validators.min(0)],
            ],
            endereco: this.fb.group({
                tipo: [{ value: this.cliente.endereco.tipo, disabled: true }],
                logradouro: [
                    { value: this.cliente.endereco.logradouro, disabled: true },
                ],
                bairro: [
                    { value: this.cliente.endereco.bairro, disabled: true },
                ],
                numero: [this.cliente.endereco.numero],
                complemento: [this.cliente.endereco.complemento],
                cep: [
                    this.cliente.endereco.cep,
                    [Validators.required, Validators.pattern(/^\d{5}-?\d{3}$/)],
                ],
                cidade: [
                    { value: this.cliente.endereco.cidade, disabled: true },
                ],
                estado: [
                    { value: this.cliente.endereco.estado, disabled: true },
                ],
            }),
        });
        this.limiteOriginal = this.cliente.limite;
        this.setupCepListener();
        this.autoFillAddressFromCep();
    }

    private setupCepListener() {
        const cepControl = this.enderecoGroup?.get('cep');
        if (cepControl) {
            cepControl.valueChanges.subscribe((cep) => {
                if (
                    cep &&
                    cep.length === 8 &&
                    /^\d{8}$/.test(cep.replace('-', ''))
                ) {
                    this.searchCep(cep);
                }
            });
        }
    }

    private autoFillAddressFromCep() {
        const cepControl = this.enderecoGroup?.get('cep');
        const logradouroControl = this.enderecoGroup?.get('logradouro');

        if (cepControl && cepControl.value) {
            const cepValue = cepControl.value;
            const isAddressEmpty =
                !logradouroControl?.value ||
                logradouroControl.value.trim() === '';

            if (isAddressEmpty && cepValue.length >= 8) {
                const cleanCep = cepValue.replace(/\D/g, '');
                if (cleanCep.length === 8) {
                    this.searchCep(cleanCep);
                }
            }
        }
    }

    searchCep(cep: string) {
        this.loadingCep = true;
        this.cepError = null;

        // Format CEP (remove any non-digit characters)
        const cleanCep = cep.replace(/\D/g, '');

        this.userService.validateCep(cleanCep).subscribe({
            next: (addressData) => {
                // Update form with API data
                this.enderecoGroup?.patchValue({
                    tipo: addressData.tipo || 'Rua',
                    logradouro: addressData.logradouro,
                    bairro: addressData.bairro,
                    cidade: addressData.cidade,
                    estado: addressData.estado,
                });
                this.loadingCep = false;
            },
            error: (err) => {
                this.cepError = 'CEP inválido ou não encontrado';
                this.loadingCep = false;
                console.error('Erro ao buscar CEP:', err);
            },
        });
    }

    toggleEdit() {
        this.editMode = !this.editMode;
        this.saved = false;
        this.cepError = null;

        if (!this.editMode) {
            // Reset form values while maintaining disabled state
            this.form.patchValue({
                nome: this.cliente.nome,
                email: this.cliente.email,
                cpf: this.cliente.cpf,
                telefone: this.cliente.telefone,
                salario: this.cliente.salario,
                endereco: {
                    tipo: this.cliente.endereco.tipo,
                    logradouro: this.cliente.endereco.logradouro,
                    bairro: this.cliente.endereco.bairro,
                    numero: this.cliente.endereco.numero,
                    complemento: this.cliente.endereco.complemento,
                    cep: this.cliente.endereco.cep,
                    cidade: this.cliente.endereco.cidade,
                    estado: this.cliente.endereco.estado,
                },
            });
        }
    }

    salvar() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.saving = true;
        this.error = null;

        const valores = this.form.getRawValue();

        const payload = {
            cpf: valores.cpf,
            nome: valores.nome,
            email: valores.email,
            telefone: valores.telefone,
            salario: valores.salario,
            endereco: `${valores.endereco.tipo} ${
                valores.endereco.logradouro
            }, ${valores.endereco.numero}${
                valores.endereco.complemento
                    ? ', ' + valores.endereco.complemento
                    : ''
            }`,
            cep: valores.endereco.cep.replace(/\D/g, ''),
            cidade: valores.endereco.cidade,
            estado: valores.endereco.estado,
            conta: this.cliente.conta,
        };

        this.clientService.updateClient(valores.cpf, payload).subscribe({
            next: (updatedClient) => {
                this.cliente = updatedClient;
                this.buildForm();
                this.saved = true;
                this.editMode = false;
                this.error = null;
                this.saving = false;

                setTimeout(() => {
                    this.saved = false;
                }, 5000);
            },
            error: (err) => {
                this.error = 'Erro ao salvar alterações. Tente novamente.';
                this.saving = false;
                console.error('Erro ao atualizar cliente:', err);
            },
        });
    }

    get enderecoGroup() {
        return this.form.get('endereco') as FormGroup;
    }

    onCepBlur() {
        const cepControl = this.enderecoGroup?.get('cep');
        if (cepControl?.value) {
            const cleanCep = cepControl.value.replace(/\D/g, '');

            // Format CEP display
            if (cleanCep.length === 8) {
                const formattedCep = `${cleanCep.substr(
                    0,
                    5
                )}-${cleanCep.substr(5, 3)}`;
                cepControl.setValue(formattedCep, { emitEvent: false });
                this.searchCep(cleanCep);
            } else if (cleanCep.length > 0 && cleanCep.length < 8) {
                this.cepError = 'CEP deve conter 8 dígitos';
            }
        }
    }

    onCepInput(event: any) {
        const input = event.target;
        let value = input.value.replace(/\D/g, ''); // Remove non-digits

        // Limit to 8 digits
        if (value.length > 8) {
            value = value.substr(0, 8);
        }

        // Format as 00000-000
        if (value.length > 5) {
            value = `${value.substr(0, 5)}-${value.substr(5)}`;
        }

        input.value = value;
        this.enderecoGroup?.get('cep')?.setValue(value, { emitEvent: false });

        // Clear previous error
        if (this.cepError && value.length < 8) {
            this.cepError = null;
        }
    }

    getCurrentUser() {
        return this.authService.getUser();
    }

    getCurrentUserRole() {
        return this.authService.getUserRole();
    }
}
