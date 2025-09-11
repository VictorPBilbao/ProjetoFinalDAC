import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

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

  onSubmit(): void {
    if (this.loginForm.valid) {
      const { user, password } = this.loginForm.value;
      if (this.authService.login(user, password)) {
        this.mensagem = 'Login realizado com sucesso!';
        const role = this.authService.getUserRole();
        if (role === 'cliente') {
          this.router.navigate(['/cliente/dashboard']);
        } else if (role === 'gerente') {
          this.router.navigate(['/gerente/clientes']);
        } else if (role === 'admin') {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigate(['/login']);
        }
      } else {
        this.mensagem = 'Usuário ou senha incorretos!';
      }
    } else {
      this.mensagem = 'Preencha todos os campos!';
    }
  }
}
