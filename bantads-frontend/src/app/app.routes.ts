import { Routes } from '@angular/router';

import { DepositoComponent } from './features/pages/deposito/deposito.component';
import { LoginComponent } from './features/pages/login/login.component';
import { RegisterComponent } from './features/pages/register/register.component';
import { StatementComponent } from './features/pages/statement/statement.component';
import { UserDashboardComponent } from './features/pages/user-dashboard/user-dashboard.component';
import { UserDetailsComponent } from './features/pages/user-details/user-details.component';
import { ListClientsComponent } from './features/pages/list-clients/list-clients.component';

export const routes: Routes = [
  {
    path: '',
    component: LoginComponent,
  },
  {
    path: 'cadastro',
    component: RegisterComponent,
  },
  {
    path: 'extrato',
    component: StatementComponent,
  },
  {
    path: 'deposito',
    component: DepositoComponent,
  },
  {
    path: 'dashboard-cliente',
    component: UserDashboardComponent,
  },
  {
    path: 'detalhes-cliente',
    component: UserDetailsComponent,
  },
  {
    path: 'clientes',
    component: ListClientsComponent,
  },
  { path: '**', redirectTo: '' },
];
