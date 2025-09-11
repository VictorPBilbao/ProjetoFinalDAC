import { Injectable } from '@angular/core';
//import { DashboardAdminService } from '../dashboard-admin.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly USERS = [
    { user: 'guilherme@bantads.com', password: 'guilherme', role: 'cliente' },
    { user: 'leonardo@bantads.com', password: 'leonardo', role: 'cliente' },
    { user: 'victor@bantads.com', password: 'victor', role: 'cliente' },
    { user: 'adriano@bantads.com', password: 'adriano', role: 'cliente' },
    { user: 'vinicius@bantads.com', password: 'vinicius', role: 'cliente' },
    { user: 'thalita@bantads.com', password: 'thalita', role: 'gerente' },
    { user: 'ana@bantads.com', password: 'ana', role: 'gerente' },
    { user: 'godofredo@bantads.com', password: 'godofredo', role: 'gerente' },
    { user: 'adamantio@bantads.com', password: 'adamantio', role: 'admin' }
  ];

  //try to login and save in localStorage
  login(user: string, password: string): boolean {
    const foundUser = this.USERS.find(u => u.user === user && u.password === password);
    if (foundUser) {
      localStorage.setItem('user', JSON.stringify(foundUser));
      return true;
    }
    return false;
  }

  logout(): void {
    localStorage.removeItem('user');
  }

  // returns the logged in user
  getUser(): any {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  // returns the role of the logged in user
  getUserRole(): string | null {
    const user = this.getUser();
    return user ? user.role : null;
  }

  // check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem('user');
  }
}