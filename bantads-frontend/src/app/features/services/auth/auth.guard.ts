import { CanActivateFn } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const role = authService.getUserRole();
  const url = state.url;

  //see if is authenticated
  if (authService.isAuthenticated()) {
    console.log('User is authenticated with role:', role);
    // check permission by role
    if (route.data?.['auth_user'] && route.data['auth_user'].indexOf(role) === -1) {
      router.navigate(['/login'], { queryParams: { error: "Proibido o acesso a " + url } });
      authService.logout();
      return false;
    }
    return true;
  }
  router.navigate(['/login'], { queryParams: { error: "Deve fazer o login antes de acessar " + url } });
  authService.logout();
  return false;
};