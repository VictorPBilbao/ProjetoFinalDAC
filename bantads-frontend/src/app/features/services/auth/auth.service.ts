import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, tap, catchError } from 'rxjs';

interface LoginResponse {
  access_token: string;   // Bearer <jwt> ou apenas <jwt>
  cpf: string;
  tipo: string;    // ADMIN | GERENTE | CLIENTE
  exp?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:3000';
  private TOKEN_KEY = 'auth_token';
  private USER_KEY = 'auth_user';

  constructor(private http: HttpClient) {}

  login(email: string, senha: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, senha }).pipe(
      tap(resp => {
        if (resp?.access_token) {
          const token = resp.access_token.startsWith('Bearer') ? resp.access_token : `Bearer ${resp.access_token}`;
          localStorage.setItem(this.TOKEN_KEY, token);
          localStorage.setItem(this.USER_KEY, JSON.stringify({
            cpf: resp.cpf,
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

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getUser(): { cpf: string; tipo: string; exp?: number } | null {
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