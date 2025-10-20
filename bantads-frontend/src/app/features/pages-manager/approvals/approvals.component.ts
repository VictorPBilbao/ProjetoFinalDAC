import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ManagerService } from '../../services/manager/manager.service';
import { Cliente } from '../../models/cliente.model';
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

    constructor(private readonly managerService: ManagerService) { }

    ngOnInit(): void {
        this.load();
    }

    load(): void {

        this.isLoading = true;
        const res = this.managerService.getPending();

        // Observable
        if (res && typeof (res as any).subscribe === 'function') {
            (res as any).subscribe({
                next: (data: Cliente[]) => {
                    this.pending = Array.isArray(data) ? data : [];
                    this.applyFilter();
                },
                error: (err: any) => {
                    this.setFeedback(false, err?.message ?? 'Erro ao carregar pendentes');
                    this.isLoading = false;
                },
                complete: () => {
                    this.isLoading = false;
                },
            });
            return;
        }

        // Promise
        if (res && typeof (res as any).then === 'function') {
            (res as any)
                .then((data: Cliente[]) => {
                    this.pending = Array.isArray(data) ? data : [];
                    this.applyFilter();
                })
                .catch((err: any) => this.setFeedback(false, err?.message ?? 'Erro ao carregar pendentes'))
                .finally(() => (this.isLoading = false));
            return;
        }

        // Síncrono
        try {
            this.pending = Array.isArray(res) ? res : [];
            this.applyFilter();
        } catch (err: any) {
            this.setFeedback(false, err?.message ?? 'Erro ao carregar pendentes');
        } finally {
            this.isLoading = false;
        }
    }

    onSearchChange(value: string): void {
        this.search$.next(value || '');
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
                p.cpf.replace(/\D/g, '').includes(term.replace(/\D/g, '')) ||
                (p.email?.toLowerCase().includes(term) ?? false)
        );
    }

    approve(id: string): void {
        const result = this.managerService.approve(id);
        this.setFeedback(result.ok, result.message);
        this.load();
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
        const res = this.managerService.reject(
            this.rejectingId,
            this.rejectReason
        );
        this.setFeedback(res.ok, res.message);
        if (res.ok) {
            this.rejectingId = null;
            this.rejectReason = '';
            this.load();
        }
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
