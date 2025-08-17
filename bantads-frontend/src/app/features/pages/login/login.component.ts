import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})

export class LoginComponent {
  loginForm: FormGroup;

  constructor(private fb: FormBuilder) {

    this.loginForm = this.fb.group({

      agencia: ['', [Validators.required]],
      conta: ['', [Validators.required]],
      lembrarMe: [false]
    });
  }

  onSubmit(): void {

    if (this.loginForm.valid) {
      console.log('Dados do formulário:', this.loginForm.value);
    } else {
      console.log('Formulário inválido. Por favor, preencha todos os campos.');
    }
  }
}
