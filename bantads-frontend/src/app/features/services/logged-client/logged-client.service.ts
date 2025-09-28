import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Cliente } from '../../models/cliente.model';
import { Manager } from '../../models/manager.model';
import { ServiceContaService } from '../conta/service-conta.service';
import { AuthService } from '../auth/auth.service';
import { LocalStorageServiceService } from '../local-storages/local-storage-service.service';

@Injectable({ providedIn: 'root' })
export class LoggedClientService {
  private readonly _cliente$ = new BehaviorSubject<Cliente | null>(null);
  cliente$ = this._cliente$.asObservable();
  private readonly _lastAccess$ = new BehaviorSubject<string | null>(null);
  lastAccess$ = this._lastAccess$.asObservable();

  constructor(
    private contaService: ServiceContaService,
    private storage: LocalStorageServiceService,
    private authService: AuthService
  ) {
    this.init();
    // quando algum login/logout externo alterar o currentClientEmail, re-calculamos
    try {
      window.addEventListener('clientUpdated', () => this.init());
    } catch { /* noop */ }
  }

  private init() {
    // tenta sessão via ServiceContaService first
    const session = this.contaService.getSession();
    let userEmail: string | null = null;
    if (session) {
      userEmail = session.user;
    } else {
      // fallback: tenta cookie de AuthService (registro/login via AuthService usa cookie 'user')
      const authUser = this.authService.getUser();
      if (authUser && authUser.user) {
        userEmail = authUser.user;
      }
    }

    if (!userEmail) {
      this._cliente$.next(null);
      this._lastAccess$.next(null);
      return;
    }

    // tenta buscar cliente persistido no localStorage pelo email
    const clientes = this.storage.getClientes();
    const found = clientes.find(c => c.email?.toLowerCase() === userEmail!.toLowerCase());
    if (found) {
      this._cliente$.next(found);
      // atualiza lastAccess se disponível na sessão
      const session = this.contaService.getSession();
      const last = session?.lastAccess ?? new Date().toISOString();
      this._lastAccess$.next(last);
      this.contaService.updateLastAccess(last);
      return;
    }

    // se não existe cliente persistido, tenta fallback para conta mock (serviceConta)
    const account = this.contaService.getAccountByEmail(userEmail!);
    if (account) {
      const minimal: Cliente = {
        id: account.id,
        nome: userEmail!.split('@')[0],
        email: userEmail!,
        cpf: '',
        telefone: '',
        salario: 0,
        limite: account.limite,
        saldo: account.saldo,
        manager: { id: '', cpf: '', name: '', email: '', telephone: '' } as Manager,
        endereco: {
          tipo: '',
          logradouro: '',
          bairro: '',
          numero: '',
          cep: '',
          cidade: '',
          estado: ''
        },
        agencia: account.agencia,
        conta: account.conta,
        criadoEm: account.criadoEm
      };

      this._cliente$.next(minimal);
      const last = this.contaService.getSession()?.lastAccess ?? new Date().toISOString();
      this._lastAccess$.next(last);
      this.contaService.updateLastAccess(last);
      return;
    }

    // último fallback: se existem clientes cadastrados no localStorage, escolhe o mais recente
    if (clientes && clientes.length > 0) {
      const sorted = clientes.slice().sort((a, b) => {
        const da = new Date(a.criadoEm).getTime();
        const db = new Date(b.criadoEm).getTime();
        return db - da; // decrescente
      });
      this._cliente$.next(sorted[0]);
      const last = this.contaService.getSession()?.lastAccess ?? new Date().toISOString();
      this._lastAccess$.next(last);
      this.contaService.updateLastAccess(last);
      return;
    }

    this._cliente$.next(null);
  }

  // força uma atualização (por exemplo após editar dados)
  refresh() {
    this.init();
  }

  updateClient(updated: Cliente) {
    this.storage.updateCliente(updated);
    this._cliente$.next(updated);
  }

  /**
   * Atualiza o último acesso para o momento atual (ou para um ISO fornecido).
   * Emite via lastAccess$ e persiste na sessão através do ServiceContaService.
   */
  touchLastAccess(dateIso?: string) {
    const last = dateIso ?? new Date().toISOString();
    this._lastAccess$.next(last);
    this.contaService.updateLastAccess(last);
  }
}
