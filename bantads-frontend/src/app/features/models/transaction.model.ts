export interface Transaction {
  dateTime: Date;
  operation: 'Transferencia' | 'Deposito' | 'Saque';
  fromOrToClient?: string; // Nome do cliente de destino ou de origem depende da op
  amount: number;
}
