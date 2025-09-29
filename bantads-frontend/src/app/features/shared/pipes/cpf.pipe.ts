import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cpf',
  standalone: true // Padrão em versões recentes do Angular
})
export class CpfPipe implements PipeTransform {

  transform(value: string | number | null | undefined): string {
    if (!value) {
      return '';
    }
    const cpf = String(value).replace(/\D/g, '');
    if (cpf.length !== 11) {
      return cpf;
    }
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

}