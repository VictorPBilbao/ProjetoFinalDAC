import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  constructor() {

  }

  @ViewChild('registerForm') registerForm!: NgForm | undefined;
  currentStep: number = 1;
  showPassword: boolean = false;
  isEmailAvailable: boolean = true;
  isUsernameAvailable: boolean = true;
  isCepValid: boolean = true;

  onSubmit() {}

  goToNextStep(): void {
    if (this.currentStep < 2) {
      this.currentStep++;
    }
  }

  goToPreviousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  onVerifyCep(): void {}

  onValidateEmail(): void {}

  onValidateUsername(): void {}

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}
