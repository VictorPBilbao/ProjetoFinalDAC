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
    if (this.loginForm.invalid) return;

    const { user, password } = this.loginForm.value;

    this.authService.login(user, password).subscribe({
      next: (ok) => {
        if (!ok) {
          Swal.fire({
            icon: 'error',
            title: 'Acesso Negado',
            text: 'Login ou senha inválidos, tente novamente.',
            confirmButtonColor: '#d33'
          });
          return;
        }

        const role = this.authService.getUserRole();

        switch (role) {
          case 'CLIENTE':
            this.router.navigate(['/cliente/dashboard']);
            break;
          case 'GERENTE':
            this.router.navigate(['/gerente/aprovacoes']);
            break;
          case 'ADMINISTRADOR':
            this.router.navigate(['/admin/dashboard']);
            break;
          default:
            this.router.navigate(['/login']);
            break;
        }
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Acesso Negado',
          text: err?.message || 'Falha no login. Tente novamente.',
          confirmButtonColor: '#d33'
        });
      }
    });
  }
}
