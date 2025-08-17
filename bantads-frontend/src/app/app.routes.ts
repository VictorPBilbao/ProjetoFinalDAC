import { Routes } from '@angular/router';
import { RegisterComponent } from './features/pages/register/register.component';

export const routes: Routes = [
  {
    path: 'cadastro',
    component: RegisterComponent
  },
  { path: '**', redirectTo: '' }
];
