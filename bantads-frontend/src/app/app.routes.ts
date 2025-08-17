import { Routes } from '@angular/router';
import { LoginComponent } from './features/pages/login/login.component'
import { RegisterComponent } from './features/pages/register/register.component';

export const routes: Routes = [
    { path: '', component: LoginComponent },
    { path: 'cadastro', component: RegisterComponent },
    { path: '**', redirectTo: '' },
];
