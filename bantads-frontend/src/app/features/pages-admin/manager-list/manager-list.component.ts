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
    searchTerm: string = '';
    filteredManagers: Manager[] = [];
    currentPage: number = 1;
    itemsPerPage: number = 10;
    totalPages: number = 1;
    sortColumn: keyof Manager | null = null;
    sortDirection: 'asc' | 'desc' = 'asc';
    isLoading: boolean = false;

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

    private refreshFilteredManagers(): void {
        const term = this.searchTerm.toLowerCase().trim();
        let result = this.managers;

        if (term) {
            result = result.filter(
                (m) =>
                    m.name.toLowerCase().includes(term) ||
                    m.email?.toLowerCase().includes(term) ||
                    m.cpf?.includes(term)
            );
        }

        if (this.sortColumn) {
            result = result.sort((a, b) => {
                const aVal = (a[this.sortColumn!] ?? '').toString().toLowerCase();
                const bVal = (b[this.sortColumn!] ?? '').toString().toLowerCase();

                if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        this.totalPages = Math.ceil(result.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        this.filteredManagers = result.slice(startIndex, endIndex);
    }

    // Busca dinâmica
    onSearchChange(value: string): void {
        this.searchTerm = value;
        this.currentPage = 1;
        this.refreshFilteredManagers();
    }

    // Ordenação clicando em cabeçalhos
    sortBy(column: keyof Manager): void {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        this.refreshFilteredManagers();
    }

    // Paginação simples
    goToPage(page: number): void {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.refreshFilteredManagers();
        }
    }

    nextPage(): void {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.refreshFilteredManagers();
        }
    }

    prevPage(): void {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.refreshFilteredManagers();
        }
    }
}
