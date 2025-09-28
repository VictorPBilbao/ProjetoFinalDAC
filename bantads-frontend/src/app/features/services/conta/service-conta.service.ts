import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';

export type UserRole = 'cliente' | 'gerente' | 'admin';

export interface MockUser {
  user: string; // email
  password: string;
  role: UserRole;
  name?: string;
}

export interface Account {
  id: string;
  agencia: string;
  conta: string;
  saldo: number;
  limite: number;
  criadoEm: string; // ISO date
}

export interface AuthSession {
  user: string; // email
  role: UserRole;
  token: string; // token mock
  lastAccess?: string; // ISO date
}

export interface LoginResult {
  session: AuthSession;
  account: Account;
}

const AUTH_KEY = 'bantads.auth.session';

@Injectable({ providedIn: 'root' })
export class ServiceContaService {
  // Usuários de mock
  private users: MockUser[] = [
    { user: 'guilherme@bantads.com', password: 'guilherme', role: 'cliente', name: 'Guilherme' },
    { user: 'leonardo@bantads.com', password: 'leonardo', role: 'cliente', name: 'Leonardo' },
    { user: 'victor@bantads.com', password: 'victor', role: 'cliente', name: 'Victor' },
    { user: 'adriano@bantads.com', password: 'adriano', role: 'cliente', name: 'Adriano' },
    { user: 'vinicius@bantads.com', password: 'vinicius', role: 'cliente', name: 'Vinícius' },
  ];

  // Contas por usuário (email)
  private accountsByEmail: Record<string, Account> = {
    'guilherme@bantads.com': {
      id: 'ACC-0001', agencia: '001', conta: '000001-1', saldo: 1500.25, limite: 500.0,
      criadoEm: '2024-01-12T10:20:00.000Z'
    },
    'leonardo@bantads.com': {
      id: 'ACC-0002', agencia: '001', conta: '000002-2', saldo: 3200.0, limite: 1000.0,
      criadoEm: '2024-03-05T14:35:00.000Z'
    },
    'victor@bantads.com': {
      id: 'ACC-0003', agencia: '002', conta: '000003-3', saldo: 842.42, limite: 700.0,
      criadoEm: '2024-06-21T09:10:00.000Z'
    },
    'adriano@bantads.com': {
      id: 'ACC-0004', agencia: '003', conta: '000004-4', saldo: 10250.9, limite: 2000.0,
      criadoEm: '2023-11-28T16:00:00.000Z'
    },
    'vinicius@bantads.com': {
      id: 'ACC-0005', agencia: '003', conta: '000005-5', saldo: 50.0, limite: 300.0,
      criadoEm: '2025-01-02T08:00:00.000Z'
    },
  };

  constructor() { }

  // Login mock: valida usuário e senha e retorna sessão + conta
  login(user: string, password: string): Observable<LoginResult> {
    const found = this.users.find(u => u.user.toLowerCase() === user.toLowerCase());
    if (!found || found.password !== password) {
      return throwError(() => new Error('Credenciais inválidas'));
    }

    const token = btoa(`${found.user}:${Date.now()}`);
    const session: AuthSession = { user: found.user, role: found.role, token };
    const account = this.accountsByEmail[found.user];

    if (!account) {
      return throwError(() => new Error('Conta não encontrada para o usuário'));
    }

    return of({ session, account }).pipe(
      delay(300), // simula rede
      tap(result => this.saveSession(result.session))
    );
  }

  logout(): void {
    try { localStorage.removeItem(AUTH_KEY); } catch { /* noop */ }
  }

  updateLastAccess(dateIso?: string) {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return;
      const session = JSON.parse(raw) as AuthSession;
      session.lastAccess = dateIso ?? new Date().toISOString();
      this.saveSession(session);
    } catch {
      // noop
    }
  }

  isAuthenticated(): boolean {
    return !!this.getSession();
  }

  getSession(): AuthSession | null {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) as AuthSession : null;
    } catch {
      return null;
    }
  }

  getCurrentAccount(): Account | null {
    const session = this.getSession();
    if (!session) return null;
    return this.accountsByEmail[session.user] ?? null;
  }

  getAccountByEmail(email: string): Account | null {
    return this.accountsByEmail[email] ?? null;
  }

  private saveSession(session: AuthSession) {
    try { localStorage.setItem(AUTH_KEY, JSON.stringify(session)); } catch { /* noop */ }
  }
}
