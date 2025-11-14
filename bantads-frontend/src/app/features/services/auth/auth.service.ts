import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, tap } from 'rxjs';

interface LoginResponse {
  token: string;   // Bearer <jwt> ou apenas <jwt>
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

  login(login: string, senha: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { login, senha }).pipe(
      tap(resp => {
        if (resp?.token) {
          const token = resp.token.startsWith('Bearer') ? resp.token : `Bearer ${resp.token}`;
            localStorage.setItem(this.TOKEN_KEY, token);
            localStorage.setItem(this.USER_KEY, JSON.stringify({
              cpf: resp.cpf,
              tipo: resp.tipo,
              exp: resp.exp
            }));
        }
      }),
      this.handleError()
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/logout`, {}).pipe(
      tap(() => {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
      }),
      this.handleError()
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