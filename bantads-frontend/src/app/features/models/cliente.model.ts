import { Manager } from './manager.model';

export interface EnderecoCliente {
    tipo: string; // rua, avenida, etc
    logradouro: string;
    numero: string;
    complemento?: string;
    cep: string;
    cidade: string;
    estado: string;
}

export interface Cliente {
    id: string;
    nome: string;
    email: string;
    cpf: string; // Não pode ser alterado
    telefone: string;
    salario: number;
    limite: number; // limite de crédito calculado a partir do salário
    saldo: number; // saldo atual (pode ser negativo)
    manager: Manager; // nome do gerente responsável
    endereco: EnderecoCliente;
    agencia: string;
    conta: string;
    criadoEm: string;
}
