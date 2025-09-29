import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

import { Manager } from '../../models/manager.model';
import { ManagerService } from '../../services/manager/manager.service';
import { CpfPipe } from '../../shared/pipes/cpf.pipe';

@Component({
    selector: 'app-manager-list',
    standalone: true,
    imports: [CommonModule, RouterLink, CpfPipe],
    templateUrl: './manager-list.component.html',
    styleUrls: ['./manager-list.component.css'],
})
export class ManagerListComponent implements OnInit, OnDestroy {
    managers: Manager[] = [];
    private managerSubscription?: Subscription;

    constructor(
        private managerService: ManagerService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadManagers();
    }

    loadManagers(): void {
        this.managerSubscription = this.managerService
            .getManagers()
            .subscribe((data: Manager[]) => {
                this.managers = data;
            });
    }

    confirmDelete(managerId: string, managerName: string): void {
        Swal.fire({
            title: 'Você tem certeza?',
            text: `Deseja realmente remover o gerente "${managerName}"? Esta ação não pode ser desfeita.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e74c3c',
            cancelButtonColor: '#7f8c8d',
            confirmButtonText: 'Sim, remover!',
            cancelButtonText: 'Cancelar',
        }).then((result) => {
            if (result.isConfirmed) {
                this.deleteManager(managerId);
            }
        });
    }

    private deleteManager(managerId: string): void {
        this.managerService.deleteManager(managerId).subscribe({
            next: () => {
                Swal.fire(
                    'Removido!',
                    'O gerente foi removido com sucesso.',
                    'success'
                );
                this.loadManagers();
            },
            error: (err) => {
                Swal.fire(
                    'Erro!',
                    'Não foi possível remover o gerente.',
                    'error'
                );
                console.error('Erro ao remover gerente:', err);
            },
        });
    }

    ngOnDestroy(): void {
        this.managerSubscription?.unsubscribe();
    }
}
