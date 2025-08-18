import { Routes } from '@angular/router';
import { RegisterComponent } from './features/pages/register/register.component';
import { DepositoComponent } from './deposito/deposito.component';

export const routes: Routes = [
  {
    path: 'cadastro',
    component: RegisterComponent
  },
  {
    path: 'deposito',
    component: DepositoComponent
  },
  { path: '**', redirectTo: '' }
];
