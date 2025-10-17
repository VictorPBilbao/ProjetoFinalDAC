import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ManagerService } from '../../services/manager/manager.service';
import { Cliente } from '../../models/cliente.model';
import { CpfPipe } from '../../shared/pipes/cpf.pipe';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';


@Component({
    selector: 'app-approvals',
    standalone: true,
    imports: [CommonModule, FormsModule, CpfPipe],
    templateUrl: './approvals.component.html',
    styleUrls: ['./approvals.component.css'],
})
export class ApprovalsComponent implements OnInit, OnDestroy {
    pending: Cliente[] = [];
    feedbackMsg: string | null = null;
    feedbackType: 'success' | 'error' | null = null;

    rejectingId: string | null = null;
    rejectReason = '';

    search = '';
    filtered: Cliente[] = [];

    isLoading = false;
    actionInProgressId: string | null = null;

    private search$ = new Subject<string>();
    private destroy$ = new Subject<void>();

    constructor(private readonly managerService: ManagerService) { }

    ngOnInit(): void {
        // Debounce para evitar muitas filtragens em digitação rápida
        this.search$
            .pipe(debounceTime(250), distinctUntilChanged(), takeUntil(this.destroy$))
            .subscribe(() => this.applyFilter());

        this.load();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // Carrega pendentes tratando Observable / Promise / síncrono
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
        const term = (this.search || '').toLowerCase().trim();
        if (!term) {
            this.filtered = [...this.pending];
            return;
        }
        const digits = term.replace(/\D/g, '');
        this.filtered = this.pending.filter((p) =>
            p.nome.toLowerCase().includes(term) ||
            (p.cpf?.replace(/\D/g, '').includes(digits)) ||
            (p.email?.toLowerCase().includes(term) ?? false)
        );
    }

    approve(id: string): void {
        if (!id) { return; }
        this.actionInProgressId = id;
        const res = this.managerService.approve(id);
        this.handleActionResult(res, () => {
            this.actionInProgressId = null;
            this.load();
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
        if (!this.rejectingId) { return; }
        this.actionInProgressId = this.rejectingId;
        const res = this.managerService.reject(this.rejectingId, this.rejectReason);
        this.handleActionResult(res, () => {
            this.actionInProgressId = null;
            if (this.feedbackType === 'success') {
                this.rejectingId = null;
                this.rejectReason = '';
                this.load();
            }
        });
    }

    private handleActionResult(res: any, onDone?: () => void): void {
        // Observable
        if (res && typeof res.subscribe === 'function') {
            (res as any).subscribe({
                next: (r: any) => this.setFeedback(r?.ok ?? false, r?.message ?? 'Operação concluída'),
                error: (err: any) => this.setFeedback(false, err?.message ?? 'Erro na operação'),
                complete: () => onDone?.(),
            });
            return;
        }

        // Promise
        if (res && typeof res.then === 'function') {
            (res as Promise<any>)
                .then((r) => this.setFeedback(r?.ok ?? false, r?.message ?? 'Operação concluída'))
                .catch((err) => this.setFeedback(false, err?.message ?? 'Erro na operação'))
                .finally(() => onDone?.());
            return;
        }

        // Síncrono
        try {
            this.setFeedback(res?.ok ?? false, res?.message ?? (res ? 'Operação concluída' : 'Operação falhou'));
        } catch (err: any) {
            this.setFeedback(false, err?.message ?? 'Erro na operação');
        } finally {
            onDone?.();
        }
    }

    trackById(_: number, item: Cliente): string {
        return item?.id ?? String(_);
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
