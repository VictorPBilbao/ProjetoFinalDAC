import { Cliente } from './cliente.model';

export interface Manager {
  id: string;
  cpf: string;
  name: string;
  email: string;
  telephone: string;
  password?: string; //Estão como opcionais só pra eu n ter que colocar no Mock
  salt?: string;
  clients?: Cliente[];
}
