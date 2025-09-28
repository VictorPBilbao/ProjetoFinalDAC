import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { Cliente } from '../../models/cliente.model';
import { Manager } from '../../models/manager.model';
import { LoggedClientService } from '../../services/logged-client/logged-client.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-user-details',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './user-details.component.html',
    styleUrl: './user-details.component.css',
})
export class UserDetailsComponent implements OnDestroy {
    cliente!: Cliente | null;
    form!: FormGroup;
    editMode = false;
    saved = false;
    limiteOriginal!: number;
    private sub?: Subscription;

    constructor(private fb: FormBuilder, private loggedClient: LoggedClientService) {
        this.sub = this.loggedClient.cliente$.subscribe(c => {
            this.cliente = c;
            // inicializa o form com os valores do cliente quando disponível
            if (c) {
                this.buildForm();
                this.form.patchValue({
                    nome: c.nome,
                    email: c.email,
                    cpf: c.cpf,
                    telefone: c.telefone,
                    salario: c.salario,
                    endereco: { ...c.endereco }
                });
                this.limiteOriginal = c.limite;
            }
        });
    }

    private buildForm() {
        const c = this.cliente ?? {
            id: '', nome: '', email: '', cpf: '', telefone: '', salario: 0, limite: 0, saldo: 0,
            manager: { id: '', cpf: '', name: '', email: '', telephone: '' } as Manager,
            endereco: { tipo: '', logradouro: '', bairro: '', numero: '', complemento: '', cep: '', cidade: '', estado: '' },
            agencia: '', conta: '', criadoEm: new Date().toISOString()
        };

        this.form = this.fb.group({
            nome: [
                c.nome,
                [Validators.required, Validators.minLength(3)],
            ],
            email: [
                c.email,
                [Validators.required, Validators.email],
            ],
            cpf: [{ value: c.cpf, disabled: true }],
            telefone: [c.telefone, [Validators.required]],
            salario: [
                c.salario,
                [Validators.required, Validators.min(0)],
            ],
            endereco: this.fb.group({
                tipo: [c.endereco.tipo, Validators.required],
                logradouro: [
                    c.endereco.logradouro,
                    Validators.required,
                ],
                numero: [c.endereco.numero, Validators.required],
                complemento: [c.endereco.complemento],
                cep: [
                    c.endereco.cep,
                    [Validators.required, Validators.pattern(/\d{5}-?\d{3}/)],
                ],
                cidade: [c.endereco.cidade, Validators.required],
                estado: [
                    c.endereco.estado,
                    [Validators.required, Validators.maxLength(2)],
                ],
            }),
        });
        this.limiteOriginal = c.limite;
    }

    toggleEdit() {
        this.editMode = !this.editMode;
        this.saved = false;
        if (!this.editMode) {
            const c = this.cliente ?? {
                nome: '', email: '', cpf: '', telefone: '', salario: 0, endereco: { tipo: '', logradouro: '', numero: '', complemento: '', cep: '', cidade: '', estado: '' }
            };
            this.form.reset({
                nome: c.nome,
                email: c.email,
                cpf: c.cpf,
                telefone: c.telefone,
                salario: c.salario,
                endereco: { ...c.endereco },
            });
        }
    }

    salvar() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const valores = this.form.getRawValue(); // inclui CPF desabilitado

        if (!this.cliente) return;

        // Atualiza campos editáveis
        this.cliente.nome = valores.nome;
        this.cliente.email = valores.email;
        this.cliente.telefone = valores.telefone;

        const salarioAnterior = this.cliente.salario;
        this.cliente.salario = valores.salario;
        this.cliente.endereco = { ...valores.endereco };

        // Regra de recálculo de limite quando salário muda
        if (salarioAnterior !== this.cliente.salario) {
            let novoLimite = this.calcularLimite(this.cliente.salario);
            // Se o novo limite for menor que o saldo negativo atual, ajusta
            if (
                this.cliente.saldo < 0 &&
                novoLimite < Math.abs(this.cliente.saldo)
            ) {
                novoLimite = Math.abs(this.cliente.saldo);
            }
            this.cliente.limite = novoLimite;
        }

        this.saved = true;
        this.editMode = false;
        // Persiste a atualização no serviço central
        if (this.cliente) this.loggedClient.updateClient(this.cliente);
    }

    private calcularLimite(salario: number): number {
        // Conforme R4: Cliente com salário ≥ R$2.000,00 tem limite igual a metade do salário
        if (salario >= 2000) {
            return salario * 0.5;
        }
        return 0; // Sem limite para salários abaixo de R$2.000,00
    }

    get enderecoGroup() {
        return this.form.get('endereco') as FormGroup;
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
    }
}
