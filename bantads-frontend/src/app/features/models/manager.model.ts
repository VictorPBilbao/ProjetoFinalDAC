import { Cliente } from './cliente.model';

export interface Manager {
    id: string;
    cpf: string;
    nome: string;
    email: string;
    telephone: string;
    password: string;
    salt?: string;
    clients?: Cliente[];
    clientCount?: number;
    positiveTotal?: number;
    negativeTotal?: number;
}
