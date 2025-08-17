import { Routes } from '@angular/router';
import { LoginComponent } from './features/pages/login/login.component';
import { RegisterComponent } from './features/pages/register/register.component';
import { StatementComponent } from './features/pages/statement/statement.component';

export const routes: Routes = [
  {
    path: 'cadastro',
    component: RegisterComponent,
  },
  { path: '**', redirectTo: '' },
];
