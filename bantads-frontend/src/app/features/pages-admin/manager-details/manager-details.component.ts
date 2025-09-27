import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ManagerService } from '../../services/manager/manager.service';
import { Manager } from '../../models/manager.model';
import { NgxMaskDirective, NgxMaskPipe, provideNgxMask } from 'ngx-mask';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-manager-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    NgxMaskDirective,
    NgxMaskPipe
  ],
  providers: [provideNgxMask()],
  templateUrl: './manager-details.component.html',
  styleUrls: ['./manager-details.component.css']
})
export class ManagerDetailsComponent implements OnInit {

  managerForm: FormGroup;
  managerId?: string;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private managerService: ManagerService,
  ) {
    this.managerForm = this.fb.group({
      name: ['', Validators.required],
      cpf: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // pega o id da URL (se existir) para determinar edição
    this.managerId = this.route.snapshot.paramMap.get('id') || undefined;
    if (this.managerId) {
      this.isEditMode = true;
      this.loadManager(this.managerId);
    }
  }

  private loadManager(id: string): void {
    this.managerService.getManagerById(id).subscribe(manager => {
      if (manager) {
        this.managerForm.patchValue({
          name: manager.name,
          cpf: manager.cpf,
          email: manager.email,
          telephone: manager.telephone
        });
      }
    });
  }

  onSubmit(): void {
    const formValue = this.managerForm.value as Manager;

    if (this.isEditMode && this.managerId) {
      const updatedManager: Manager = { ...formValue, id: this.managerId };
      this.managerService.updateManager(updatedManager).subscribe(() => {
        Swal.fire({
          icon: 'success',
          title: 'Sucesso',
          text: 'Gerente atualizado com sucesso!',
          confirmButtonText: 'OK'
        }).then(() => {
          this.router.navigate(['/admin/gerentes']);
        });
      });
    } else {
      this.managerService.createManager(formValue).subscribe(() => {
        Swal.fire({
          icon: 'success',
          title: 'Sucesso',
          text: 'Gerente criado com sucesso!',
          confirmButtonText: 'OK'
        }).then(() => {
          this.router.navigate(['/admin/gerentes']);
        });
      });
    }
  }

  onVerifyManagerByCPF(): void {
    const cpf = this.managerForm.get('cpf')?.value;

    this.managerService.verifyManagerByCPF(cpf).subscribe(
      response => {
        const cpfControl = this.managerForm.get('cpf');
        if (!cpfControl) return;

        if (response.exists) {
          // Alerta quando CPF já existe
          Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Já existe um gerente com este CPF.',
            confirmButtonText: 'OK'
          });

          // Seta erro no campo
          cpfControl.setErrors({ exists: true });
          this.managerForm.get('cpf')?.setValue(''); // Reseta o campo de CPF
        } else {
          // Limpa erros existentes
          cpfControl.setErrors(null);
          console.log('CPF válido e disponível.');
        }
      },
      error => {
        // Alerta caso a verificação falhe (erro de requisição)
        Swal.fire({
          icon: 'error',
          title: 'Erro na verificação',
          text: 'Não foi possível verificar o CPF. Tente novamente.',
          confirmButtonText: 'OK'
        });
        this.managerForm.get('cpf')?.setValue(''); // Reseta o campo de CPF
        console.error('Erro ao verificar CPF', error);
      }
    );
  }
}
