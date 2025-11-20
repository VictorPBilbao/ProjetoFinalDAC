import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const loginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // ✅ Usa hasToken() ao invés de isAuthenticated()
  if (authService.hasToken()) {

    const role = authService.getUserRole();

    let targetDashboard = '/';

    switch (role) {
      case 'CLIENTE':
        targetDashboard = '/cliente/dashboard';
        break;
      case 'GERENTE':
      case 'MANAGER':
        targetDashboard = '/gerente/dashboard';
        break;
      case 'ADMINISTRADOR':
        targetDashboard = '/admin/dashboard';
        break;
    }

    console.log(`LoginGuard: Usuário '${role}' já logado. Redirecionando para ${targetDashboard}`);

    router.navigate([targetDashboard]);
    return false;
  }

  return true;
};