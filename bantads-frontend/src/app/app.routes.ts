import { Routes } from '@angular/router';

import { DepositoComponent } from './features/pages-customer/deposito/deposito.component';
import { LoginComponent } from './features/pages-customer/login/login.component';
import { RegisterComponent } from './features/pages-customer/register/register.component';
import { StatementComponent } from './features/pages-customer/statement/statement.component';
import { UserDashboardComponent } from './features/pages-customer/user-dashboard/user-dashboard.component';
import { UserDetailsComponent } from './features/pages-customer/user-details/user-details.component';
import { ListClientsComponent } from './features/pages-customer/list-clients/list-clients.component';
import { BestClientsListViewComponent } from './features/pages-manager/best-clients-list-view/best-clients-list-view.component';
import { ClientsReportComponent } from './features/pages-admin/clients-report/clients-report.component';
import { WhithdrawalComponent } from './features/pages/whithdrawal/whithdrawal.component';

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
    path: 'whithdrawal',
    component: WhithdrawalComponent,
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
  {
    path: 'melhores-clientes',
    component: BestClientsListViewComponent,
  },
  {
    path: 'relatorio-clientes',
    component: ClientsReportComponent,
  },
  { path: '**', redirectTo: '' },
];
