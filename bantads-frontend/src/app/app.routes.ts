import { Routes } from '@angular/router';
import { RegisterComponent } from './features/pages/register/register.component';
import { StatementComponent } from './features/pages/statement/statement.component';

export const routes: Routes = [
  {
    path: 'cadastro',
    component: RegisterComponent
  },
  {
    path: 'extrato',
    component: StatementComponent
  },
  { path: '**', redirectTo: '' }
];
