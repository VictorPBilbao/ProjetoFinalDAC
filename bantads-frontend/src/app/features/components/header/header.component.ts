import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

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

  // usuário teste
  private readonly USER_DATA = {
    user: 'teste@bantads.com',
    password: 'teste'
  };

  constructor(private fb: FormBuilder, private router: Router) {
    this.loginForm = this.fb.group({
      user: ['', [Validators.required]],
      password: ['', [Validators.required]],
      lembrarMe: [false]
    });
  }
  onSubmit(): void {
    if (this.loginForm.valid) {
      const { user, password } = this.loginForm.value;
      if (user === this.USER_DATA.user && password === this.USER_DATA.password) {
        this.mensagem = 'Login realizado com sucesso!';
        // redireciona para /dashboard-cliente
        this.router.navigate(['/dashboard-cliente']);
      } else {
        this.mensagem = 'Usuário ou senha incorretos!';
      }
    } else {
      this.mensagem = 'Formulário inválido. Por favor, preencha todos os campos.';
    }
  }
}
