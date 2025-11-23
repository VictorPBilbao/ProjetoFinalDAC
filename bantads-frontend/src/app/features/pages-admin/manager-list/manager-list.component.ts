import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

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
    searchTerm: string = '';
    filteredManagers: Manager[] = [];
    currentPage: number = 1;
    itemsPerPage: number = 10;
    totalPages: number = 1;
    sortColumn: keyof Manager | null = null;
    sortDirection: 'asc' | 'desc' = 'asc';
    isLoading: boolean = false;

    constructor(private managerService: ManagerService) {}

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

    confirmDelete(managerCpf: string, managerName: string): void {
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
                this.deleteManager(managerCpf);
            }
        });
    }

    private deleteManager(managerCpf: string): void {
        this.managerService.deleteManager(managerCpf).subscribe({
            next: (response) => {
                const successMsg =
                    response?.message || 'O gerente foi removido com sucesso.';
                Swal.fire('Removido!', successMsg, 'success').then(() => {
                    this.loadManagers();
                });
            },
            error: (err) => {
                const errorMsg =
                    err.error?.message || 'Não foi possível remover o gerente.';
                Swal.fire('Erro!', errorMsg, 'error');
                console.error('Erro ao remover gerente:', err);
            },
        });
    }

    ngOnDestroy(): void {
        this.managerSubscription?.unsubscribe();
    }
}
