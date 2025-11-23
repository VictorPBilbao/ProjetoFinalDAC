import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Manager } from '../../models/manager.model';
import { ManagerService } from '../../services/manager/manager.service';

@Component({
    selector: 'app-manager-details',
    standalone: true,
    imports: [CommonModule, RouterLink, ReactiveFormsModule, NgxMaskDirective],
    providers: [provideNgxMask()],
    templateUrl: './manager-details.component.html',
    styleUrls: ['./manager-details.component.css'],
})
export class ManagerDetailsComponent implements OnInit {
    managerForm: FormGroup;
    managerCpf?: string;
    isEditMode = false;

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private route: ActivatedRoute,
        private managerService: ManagerService
    ) {
        this.managerForm = this.fb.group({
            nome: ['', [Validators.required, Validators.minLength(3)]],
            cpf: ['', [Validators.required]],
            email: ['', [Validators.required, Validators.email]],
            telephone: ['', [Validators.required]],
            password: ['', [Validators.required, Validators.minLength(6)]],
        });
    }

    ngOnInit(): void {
        this.managerCpf = this.route.snapshot.paramMap.get('cpf') || undefined;
        if (this.managerCpf) {
            this.isEditMode = true;
            this.loadManager(this.managerCpf);
        }
    }

    private loadManager(managercpf: string): void {
        this.managerService.getManagerById(managercpf).subscribe((manager) => {
            if (manager) {
                this.managerForm.patchValue(manager);

                this.managerForm.get('password')?.clearValidators();
                this.managerForm
                    .get('password')
                    ?.addValidators(Validators.minLength(6));
                this.managerForm.get('password')?.updateValueAndValidity();

                this.managerForm.get('cpf')?.disable();
                this.managerForm.get('email')?.disable();
                this.managerForm.get('telephone')?.disable();
            }
        });
    }

    onSubmit(): void {
        if (this.managerForm.invalid) {
            this.managerForm.markAllAsTouched();
            return;
        }

        const action$ = this.isEditMode ? this.update() : this.create();

        action$.subscribe({
            next: (response) => {
                console.log('Resposta completa:', response);

                if (response.success === false) {
                    Swal.fire(
                        'Erro!',
                        response.message || 'Falha ao salvar o gerente.',
                        'error'
                    );
                } else {
                    Swal.fire(
                        'Sucesso!',
                        'Gerente salvo com sucesso!',
                        'success'
                    ).then(() => this.router.navigate(['/admin/gerentes']));
                }
            },
            error: (err) => {
                const backendMsg =
                    err.error?.message ||
                    'Ocorreu um erro inesperado ao salvar o gerente.';
                Swal.fire('Erro!', backendMsg, 'error');
                console.error('Erro ao salvar gerente:', err);
            },
        });
    }

    private create(): Observable<any> {
        return this.managerService.createManager(this.managerForm.value);
    }

    private update(): Observable<any> {
        const formValues = this.managerForm.getRawValue();
        return this.managerService.updateManager(formValues as Manager);
    }

    onVerifyManagerByCPF(): void {
        if (this.isEditMode) return;

        const cpfControl = this.managerForm.get('cpf');
        if (!cpfControl?.valid || !cpfControl.value) return;

        const cpf = cpfControl.value;
        this.managerService.verifyManagerByCPF(cpf).subscribe((response) => {
            if (response.exists) {
                Swal.fire(
                    'CPF já existe',
                    'Já existe um gerente cadastrado com este CPF.',
                    'error'
                );
                cpfControl.setErrors({ exists: true });
            }
        });
    }
}
