import { Routes } from '@angular/router';

import { DepositoComponent } from './deposito/deposito.component';
import { RegisterComponent } from './features/pages/register/register.component';
import { UserDashboardComponent } from './features/pages/user-dashboard/user-dashboard.component';

export const routes: Routes = [
  {
    path: 'cadastro',
    component: RegisterComponent,
  },
  {
    path: 'deposito',
    component: DepositoComponent,
  },
  {
    path: 'dashboard-cliente',
    component: UserDashboardComponent,
  },
  { path: '**', redirectTo: '' },
];
