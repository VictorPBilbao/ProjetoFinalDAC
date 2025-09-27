import { Injectable } from '@angular/core';
import { LocalStorageServiceService } from '../local-storages/local-storage-service.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private localStorageService: LocalStorageServiceService
  ) { }

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
    // busca todos os usuários no localStorage
    const users = this.localStorageService.getUsers();

    // procura se existe um usuário que bate com email/username + senha
    const foundUser = users.find(u => u.user === user && u.password === password);

    if (foundUser) {
      this.saveUserInCookie(foundUser); // salva user em cookie
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
