import { Routes } from '@angular/router';
import { authGuard } from './features/services/auth/auth.guard';

//standard pages
import { LoginComponent } from './features/pages-customer/login/login.component';
import { RegisterComponent } from './features/pages-customer/register/register.component';
import { PageNotFoundComponent } from './features/pages/page-not-found/page-not-found.component';

//customer pages
import { StatementComponent } from './features/pages-customer/statement/statement.component';
import { DepositoComponent } from './features/pages-customer/deposito/deposito.component';
import { UserDashboardComponent } from './features/pages-customer/user-dashboard/user-dashboard.component';
import { UserDetailsComponent } from './features/pages-customer/user-details/user-details.component';
import { WhithdrawalComponent } from './features/pages-customer/whithdrawal/whithdrawal.component';

//manager pages
import { ListClientsComponent } from './features/pages-manager/list-clients/list-clients.component';
import { BestClientsListViewComponent } from './features/pages-manager/best-clients-list-view/best-clients-list-view.component';
import { ConsultarClienteComponent } from './features/pages-manager/consultar-cliente/consultar-cliente.component';

//admin pages
import { DashboardAdminComponent } from './features/pages-admin/dashboard-admin/dashboard-admin.component';
import { ClientsReportComponent } from './features/pages-admin/clients-report/clients-report.component';
import { ManagerListComponent } from './features/pages-admin/manager-list/manager-list.component';
import { ManagerDetailsComponent } from './features/pages-admin/manager-details/manager-details.component';

export const routes: Routes = [
  //standard routes
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'cadastro', component: RegisterComponent },

  // customer routes
  {
    path: 'cliente',
    children: [
      { path: 'dashboard', component: UserDashboardComponent, canActivate: [authGuard], data: { role: ['cliente'] } },
      { path: 'extrato', component: StatementComponent, canActivate: [authGuard], data: { role: ['cliente'] } },
      { path: 'deposito', component: DepositoComponent, canActivate: [authGuard], data: { role: ['cliente'] } },
      { path: 'saque', component: WhithdrawalComponent, canActivate: [authGuard], data: { role: ['cliente'] } },
      { path: 'detalhes', component: UserDetailsComponent, canActivate: [authGuard], data: { role: ['cliente'] } },
    ]
  },

  // manager routes
  {
    path: 'gerente',
    children: [
      { path: 'clientes', component: ListClientsComponent, canActivate: [authGuard], data: { role: ['gerente'] } },
      { path: 'melhores-clientes', component: BestClientsListViewComponent, canActivate: [authGuard], data: { role: ['gerente'] } },
      { path: 'consultar-cliente', component: ConsultarClienteComponent, canActivate: [authGuard], data: { role: ['gerente'] } },
    ]
  },

  // admin routes
  {
    path: 'admin',
    children: [
      { path: 'dashboard', component: DashboardAdminComponent, canActivate: [authGuard], data: { role: ['admin'] } },
      { path: 'relatorio-clientes', component: ClientsReportComponent, canActivate: [authGuard], data: { role: ['admin'] } },
      { path: 'gerentes', component: ManagerListComponent, canActivate: [authGuard], data: { role: ['admin'] } },
      { path: 'gerente/novo', component: ManagerDetailsComponent, canActivate: [authGuard], data: { role: ['admin'] } },
      { path: 'gerente/:id', component: ManagerDetailsComponent, canActivate: [authGuard], data: { role: ['admin'] } },
    ]
  },
  // page not found
  { path: '**', component: PageNotFoundComponent },
];
