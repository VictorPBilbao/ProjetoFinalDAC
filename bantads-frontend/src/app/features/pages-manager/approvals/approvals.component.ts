import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ManagerService } from '../../services/manager/manager.service';
import { Cliente } from '../../models/cliente.model';

@Component({
    selector: 'app-approvals',
    standalone: true,
    imports: [CommonModule, FormsModule],
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

    constructor(private readonly managerService: ManagerService) {}

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.pending = this.managerService.getPending();
        this.applyFilter();
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
