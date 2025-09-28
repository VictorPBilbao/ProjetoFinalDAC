import { DecimalPipe, NgStyle } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';

import { Cliente } from '../../models/cliente.model';
import { Subscription } from 'rxjs';
import { ClientService } from '../../services/client/client.service';
@Component({
    selector: 'app-user-dashboard',
    imports: [NgStyle, DecimalPipe],
    templateUrl: './user-dashboard.component.html',
    styleUrl: './user-dashboard.component.css',
})
export class UserDashboardComponent implements OnDestroy {
    user: Cliente | null = null;
    balance: number = 0;
    private sub?: Subscription;

    constructor(private clientService: ClientService) {}

    onInit(): void {
        this.user = this.clientService.getLoggedClient() || null;
        this.balance = this.user?.saldo ?? 0;
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
    }
}
