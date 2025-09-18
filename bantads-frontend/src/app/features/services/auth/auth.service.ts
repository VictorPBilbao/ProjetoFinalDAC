import { Injectable } from '@angular/core';

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

  private saveUserInCookie(user: any): void { //save user in cookie for 24 hours
    const expires = new Date(); //set expiration time to 24 hours
    expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000);

    const userString = encodeURIComponent(JSON.stringify(user)); //encode user object to string
    document.cookie = `user=${userString}; path=/; secure; samesite=strict; expires=${expires.toUTCString()}`; //set cookie
  }

  private removeUserCookie(): void { //remove user cookie
    document.cookie = 'user=; path=/; secure; samesite=strict; expires=Thu, 01 Jan 1970 00:00:00 UTC;'; //set cookie expiration to past date
  }

  login(user: string, password: string): boolean { //find user in USERS array
    const foundUser = this.USERS.find(u => u.user === user && u.password === password); //check if user exists
    if (foundUser) {
      this.saveUserInCookie(foundUser); //save user in cookie
      return true;
    }
    return false;
  }

  logout(): void { //remove user cookie
    this.removeUserCookie();
  }

  getUser(): any { //get user from cookie
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [key, value] = cookie.trim().split('=');
      if (key === 'user') {
        try {
          return JSON.parse(decodeURIComponent(value));
        } catch (e) {
          console.error('Erro ao parsear o cookie do usuário', e);
          return null;
        }
      }
    }
    return null;
  }

  getUserRole(): string | null { //get user role from cookie
    const user = this.getUser();
    return user ? user.role : null;
  }

  isAuthenticated(): boolean { //check if user cookie exists
    return !!this.getUser();
  }
}