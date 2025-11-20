import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, tap, catchError, of, map } from 'rxjs';

interface LoginResponse {
  access_token: string;
  token_type: string;
  tipo: string;
  exp?: number;
  usuario: {
    cpf: string | null;
    nome: string;
    email: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:3000';
  private TOKEN_KEY = 'auth_token';
  private USER_KEY = 'auth_user';

  constructor(private http: HttpClient) {}

  login(usuario: string, senha: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { usuario, senha }).pipe(
      tap(resp => {
        if (resp?.access_token) {
          const token = resp.access_token.startsWith('Bearer') ? resp.access_token : `Bearer ${resp.access_token}`;
          localStorage.setItem(this.TOKEN_KEY, token);
          localStorage.setItem(this.USER_KEY, JSON.stringify({
            cpf: resp.usuario?.cpf,
            nome: resp.usuario?.nome,
            email: resp.usuario?.email,
            tipo: resp.tipo,
            exp: resp.exp
          }));
        }
      }),
      catchError((err: HttpErrorResponse) => {
        const message = err.error?.message || 'Falha no login';
        return throwError(() => new Error(message));
      })
    );
  }

  logout(): Observable<void> {
    const token = localStorage.getItem(this.TOKEN_KEY);

    return this.http.post<void>(
      `${this.apiUrl}/logout`,
      {},
      {
        headers: {
          Authorization: token ?? ''
        }
      }
    ).pipe(
      tap(() => {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
      }),
      catchError((err: HttpErrorResponse) => {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        return throwError(() => new Error(err.error?.message || 'Falha ao fazer logout'));
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isAuthenticated(): Observable<boolean> {
    const token = this.getToken();
    
    if (!token) {
        return of(false);
    }

    return this.http.get<any>(`${this.apiUrl}/validate`, {
        headers: { Authorization: token }
    }).pipe(
        map(() => true),
        catchError(() => {
            // Se retornar 401 ou qualquer erro, não está autenticado
            localStorage.removeItem(this.TOKEN_KEY);
            localStorage.removeItem(this.USER_KEY);
            return of(false);
        })
    );
  }

  // Método síncrono para verificação rápida (apenas checa se token existe)
  hasToken(): boolean {
      return !!this.getToken();
  }

  getUser(): { cpf: string | null; nome: string; email: string; tipo: string; exp?: number } | null {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  getUserRole(): string | null {
    return this.getUser()?.tipo || null;
  }

  private handleError<T>() {
    return (source: Observable<T>) => source.pipe(
      // simples: deixar passar; adicione catchError se quiser tratar globalmente
    );
  }
}