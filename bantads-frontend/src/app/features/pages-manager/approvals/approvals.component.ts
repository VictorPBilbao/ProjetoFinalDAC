import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Cliente } from '../../models/cliente.model';
import { ManagerService } from '../../services/manager/manager.service';
import { CpfPipe } from '../../shared/pipes/cpf.pipe';

@Component({
    selector: 'app-approvals',
    standalone: true,
    imports: [CommonModule, FormsModule, CpfPipe],
    templateUrl: './approvals.component.html',
    styleUrls: ['./approvals.component.css'],
})
export class ApprovalsComponent implements OnInit {
    pending: Cliente[] = [];
    feedbackMsg: string | null = null;
    feedbackType: 'success' | 'error' | null = null;

    rejectingId: string | null = null;
    rejectReason = '';

    search = '';
    filtered: Cliente[] = [];

    isLoading = false;
    actionInProgressId: string | null = null;

    constructor(private readonly managerService: ManagerService) {}

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.isLoading = true;
        this.managerService.getPending().subscribe({
            next: (data: Cliente[]) => {
                this.pending = Array.isArray(data) ? data : [];
                this.applyFilter();
                this.isLoading = false;
            },
            error: (err: any) => {
                this.setFeedback(
                    false,
                    err?.message ?? 'Erro ao carregar pendentes'
                );
                this.isLoading = false;
            },
        });
    }

    applyFilter(): void {
        const term = this.search.toLowerCase().trim();
        if (!term) {
            this.filtered = [...this.pending];
            return;
        }
        this.filtered = this.pending.filter(
            (p) =>
                p.nome.toLowerCase().includes(term) ||
                p.cpf
                    .replaceAll(/\D/g, '')
                    .includes(term.replaceAll(/\D/g, '')) ||
                (p.email?.toLowerCase().includes(term) ?? false)
        );
    }

    approve(cpf: string): void {
        this.actionInProgressId = cpf;
        this.managerService.approve(cpf).subscribe({
            next: (result) => {
                this.setFeedback(result.ok, result.message);
                if (result.ok) {
                    this.load();
                }
                this.actionInProgressId = null;
            },
            error: (err) => {
                this.setFeedback(
                    false,
                    err?.message ?? 'Erro ao aprovar cliente'
                );
                this.actionInProgressId = null;
            },
        });
    }

    startReject(id: string): void {
        this.rejectingId = id;
        this.rejectReason = '';
    }

    cancelReject(): void {
        this.rejectingId = null;
        this.rejectReason = '';
    }

    confirmReject(): void {
        if (!this.rejectingId) {
            return;
        }
        const cpfToReject = this.rejectingId;
        this.actionInProgressId = cpfToReject;

        this.managerService.reject(cpfToReject, this.rejectReason).subscribe({
            next: (result) => {
                this.setFeedback(result.ok, result.message);
                if (result.ok) {
                    this.rejectingId = null;
                    this.rejectReason = '';
                    this.load();
                }
                this.actionInProgressId = null;
            },
            error: (err) => {
                this.setFeedback(
                    false,
                    err?.message ?? 'Erro ao rejeitar cliente'
                );
                this.actionInProgressId = null;
            },
        });
    }

    trackById(_index: number, item: Cliente): string {
        return item.id;
    }

    private setFeedback(ok: boolean, msg: string): void {
        this.feedbackType = ok ? 'success' : 'error';
        this.feedbackMsg = msg;
        setTimeout(() => {
            this.feedbackMsg = null;
            this.feedbackType = null;
        }, 4000);
    }
}
