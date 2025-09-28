import { Routes } from '@angular/router';

import { ClientsReportComponent } from './features/pages-admin/clients-report/clients-report.component';
//admin pages
import { DashboardAdminComponent } from './features/pages-admin/dashboard-admin/dashboard-admin.component';
import { ManagerDetailsComponent } from './features/pages-admin/manager-details/manager-details.component';
import { ManagerListComponent } from './features/pages-admin/manager-list/manager-list.component';
import { DepositoComponent } from './features/pages-customer/deposito/deposito.component';
//standard pages
import { LoginComponent } from './features/pages-customer/login/login.component';
import { RegisterComponent } from './features/pages-customer/register/register.component';
//customer pages
import { StatementComponent } from './features/pages-customer/statement/statement.component';
import { UserDashboardComponent } from './features/pages-customer/user-dashboard/user-dashboard.component';
import { UserDetailsComponent } from './features/pages-customer/user-details/user-details.component';
import { WhithdrawalComponent } from './features/pages-customer/whithdrawal/whithdrawal.component';
import { TransferComponent } from './features/pages-customer/transfer/transfer.component';
import { ApprovalsComponent } from './features/pages-manager/approvals/approvals.component';
import { BestClientsListViewComponent } from './features/pages-manager/best-clients-list-view/best-clients-list-view.component';
import { ConsultarClienteComponent } from './features/pages-manager/consultar-cliente/consultar-cliente.component';
//manager pages
import { ListClientsComponent } from './features/pages-manager/list-clients/list-clients.component';
import { ManagerDashboardComponent } from './features/pages-manager/manager-dashboard/manager-dashboard.component';
import { PageNotFoundComponent } from './features/pages/page-not-found/page-not-found.component';
import { authGuard } from './features/services/auth/auth.guard';
import { loginGuard } from './features/services/auth/login.guard';

export const routes: Routes = [
    //standard routes
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent, canActivate: [loginGuard] },
    { path: 'cadastro', component: RegisterComponent },

    // customer routes
    {
        path: 'cliente',
        children: [
            {
                path: 'dashboard',
                component: UserDashboardComponent,
                canActivate: [authGuard],
                data: { role: ['cliente'] },
            },
            {
                path: 'extrato',
                component: StatementComponent,
                canActivate: [authGuard],
                data: { role: ['cliente'] },
            },
            {
                path: 'deposito',
                component: DepositoComponent,
                canActivate: [authGuard],
                data: { role: ['cliente'] },
            },
            {
                path: 'saque',
                component: WhithdrawalComponent,
                canActivate: [authGuard],
                data: { role: ['cliente'] },
            },
            {
                path: 'transferencia',
                component: TransferComponent,
                canActivate: [authGuard],
                data: { role: ['cliente'] },
            },
            {
                path: 'detalhes',
                component: UserDetailsComponent,
                canActivate: [authGuard],
                data: { role: ['cliente'] },
            },
        ],
    },

    // manager routes
    {
        path: 'gerente',
        children: [
            { path: '', redirectTo: 'aprovacoes', pathMatch: 'full' },
            {
                path: 'dashboard',
                component: ManagerDashboardComponent,
                canActivate: [authGuard],
                data: { role: ['gerente'] },
            },
            {
                path: 'aprovacoes',
                component: ApprovalsComponent,
                canActivate: [authGuard],
                data: { role: ['gerente'] },
            },
            {
                path: 'clientes',
                component: ListClientsComponent,
                canActivate: [authGuard],
                data: { role: ['gerente'] },
            },
            {
                path: 'melhores-clientes',
                component: BestClientsListViewComponent,
                canActivate: [authGuard],
                data: { role: ['gerente'] },
            },
            {
                path: 'consultar-cliente',
                component: ConsultarClienteComponent,
                canActivate: [authGuard],
                data: { role: ['gerente'] },
            },
        ],
    },

    // admin routes
    {
        path: 'admin',
        children: [
            {
                path: 'dashboard',
                component: DashboardAdminComponent,
                canActivate: [authGuard],
                data: { role: ['admin'] },
            },
            {
                path: 'relatorio-clientes',
                component: ClientsReportComponent,
                canActivate: [authGuard],
                data: { role: ['admin'] },
            },
            {
                path: 'gerentes',
                component: ManagerListComponent,
                canActivate: [authGuard],
                data: { role: ['admin'] },
            },
            {
                path: 'gerente/novo',
                component: ManagerDetailsComponent,
                canActivate: [authGuard],
                data: { role: ['admin'] },
            },
            {
                path: 'gerente/:id',
                component: ManagerDetailsComponent,
                canActivate: [authGuard],
                data: { role: ['admin'] },
            },
        ],
    },
    // page not found
    { path: '**', component: PageNotFoundComponent },
];
