import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Cliente } from '../../models/cliente.model';

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-details.component.html',
  styleUrl: './user-details.component.css',
})
export class UserDetailsComponent {
  cliente!: Cliente;
  form!: FormGroup;
  editMode = false;
  saved = false;
  limiteOriginal!: number;

  constructor(private fb: FormBuilder) {
    // Mock inicial do cliente
    this.cliente = {
      id: '1',
      nome: 'João Silva',
      email: 'joao.silva@example.com',
      cpf: '123.456.789-00',
      telefone: '(11) 98888-7777',
      salario: 5000,
      limite: 5000 * 0.5,
      saldo: -500,
      gerenteNome: 'Maria Pereira',
      endereco: {
        tipo: 'Rua',
        logradouro: 'das Flores',
        numero: '123',
        complemento: 'Apto 45',
        cep: '01000-000',
        cidade: 'São Paulo',
        estado: 'SP',
      },
      agencia: '0001',
      conta: '123456-7',
      criadoEm: new Date().toISOString(),
    };

    this.buildForm();
  }

  private buildForm() {
    this.form = this.fb.group({
      nome: [this.cliente.nome, [Validators.required, Validators.minLength(3)]],
      email: [this.cliente.email, [Validators.required, Validators.email]],
      cpf: [{ value: this.cliente.cpf, disabled: true }],
      telefone: [this.cliente.telefone, [Validators.required]],
      salario: [this.cliente.salario, [Validators.required, Validators.min(0)]],
      endereco: this.fb.group({
        tipo: [this.cliente.endereco.tipo, Validators.required],
        logradouro: [this.cliente.endereco.logradouro, Validators.required],
        numero: [this.cliente.endereco.numero, Validators.required],
        complemento: [this.cliente.endereco.complemento],
        cep: [
          this.cliente.endereco.cep,
          [Validators.required, Validators.pattern(/\d{5}-?\d{3}/)],
        ],
        cidade: [this.cliente.endereco.cidade, Validators.required],
        estado: [
          this.cliente.endereco.estado,
          [Validators.required, Validators.maxLength(2)],
        ],
      }),
    });
    this.limiteOriginal = this.cliente.limite;
  }

  toggleEdit() {
    this.editMode = !this.editMode;
    this.saved = false;
    if (!this.editMode) {
      this.form.reset({
        nome: this.cliente.nome,
        email: this.cliente.email,
        cpf: this.cliente.cpf,
        telefone: this.cliente.telefone,
        salario: this.cliente.salario,
        endereco: { ...this.cliente.endereco },
      });
    }
  }

  salvar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.getRawValue(); // inclui CPF desabilitado

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
      if (this.cliente.saldo < 0 && novoLimite < Math.abs(this.cliente.saldo)) {
        novoLimite = Math.abs(this.cliente.saldo);
      }
      this.cliente.limite = novoLimite;
    }

    this.saved = true;
    this.editMode = false;
  }

  private calcularLimite(salario: number): number {
    // Estratégia simples: 30% do salário, arredondado para 2 casas
    return Math.round(salario * 0.3 * 100) / 100;
  }

  get enderecoGroup() {
    return this.form.get('endereco') as FormGroup;
  }
}
