import { CanActivateFn } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { map } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const role = authService.getUserRole();
  const url = state.url;

  return authService.isAuthenticated().pipe(
    map(isAuth => {
      if (!isAuth) {
        console.log('[Guard] Não autenticado, redirecionando...');
        router.navigate(['/login'], { 
          queryParams: { error: "Deve fazer o login antes de acessar " + url } 
        });
        return false;
      }

      const role = authService.getUserRole();
      console.log('[Guard] Autenticado com role:', role);
      
      // check permission by role
      if (route.data?.['auth_user'] && route.data['auth_user'].indexOf(role) === -1) {
        console.log('[Guard] Sem permissão, redirecionando...');
        router.navigate(['/login'], { 
          queryParams: { error: "Proibido o acesso a " + url } 
        });
        return false;
      }
      
      return true;
    })
  );
};