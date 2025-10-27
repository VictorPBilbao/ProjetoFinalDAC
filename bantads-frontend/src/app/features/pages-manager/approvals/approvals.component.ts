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

    isLoading = false;
    actionInProgressId: string | null = null;

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

    async approve(id: string): Promise<void> {
        const res = this.managerService.approve(id);
        const result = await this.handleActionResult(res, id);
        if (result?.ok) {
            await this.load();
        }
    }

    startReject(id: string): void {
        this.rejectingId = id;
        this.rejectReason = '';
    }

    cancelReject(): void {
        this.rejectingId = null;
        this.rejectReason = '';
    }

    async confirmReject(): Promise<void> {
        if (!this.rejectingId) {
            return;
        }
        const res = this.managerService.reject(
            this.rejectingId,
            this.rejectReason
        );
        const result = await this.handleActionResult(res, this.rejectingId);
        if (result?.ok) {
            this.rejectingId = null;
            this.rejectReason = '';
            await this.load();
        }
    }

    private async handleActionResult(res: any, id?: string): Promise<any> {
        this.actionInProgressId = id ?? null;
        try {
            // Observable
            if (res && typeof res.subscribe === 'function') {
                const promise = new Promise<any>((resolve, reject) => {
                    (res as any).subscribe({
                        next: (v: any) => resolve(v),
                        error: (e: any) => reject(e),
                    });
                });
                const result = await promise;
                this.setFeedback(result?.ok ?? true, result?.message ?? '');
                return result;
            }

            // Promise
            if (res && typeof res.then === 'function') {
                const result = await res;
                this.setFeedback(result?.ok ?? true, result?.message ?? '');
                return result;
            }

            // Síncrono
            const result = res;
            this.setFeedback(result?.ok ?? true, result?.message ?? '');
            return result;
        } catch (err: any) {
            this.setFeedback(false, err?.message ?? 'Erro na operação');
            return null;
        } finally {
            this.actionInProgressId = null;
        }
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
