import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  loginForm: FormGroup;
  mensagem: string = '';
  senhaVisivel: boolean = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      user: ['', [Validators.required]],
      password: ['', [Validators.required]],
      lembrarMe: [false]
    });
  }

  toggleVisibilidadeSenha(): void {
    this.senhaVisivel = !this.senhaVisivel;
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const { user, password } = this.loginForm.value;
      if (this.authService.login(user, password)) {
        const role = this.authService.getUserRole();
        console.log('ROLE DO USUÁRIO LOGADO:', role);
        if (role === 'cliente') {
          this.router.navigate(['/cliente/dashboard']);
        } else if (role === 'gerente') {
          this.router.navigate(['/gerente/dashboard']);
        } else if (role === 'admin') {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigate(['/login']);
        }
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Acesso Negado',
          text: 'Login ou senha inválidos, tente novamente.',
          confirmButtonColor: '#d33'
        });
      }
    }
  }
}
