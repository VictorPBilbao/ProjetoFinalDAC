import { DecimalPipe, NgStyle } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';

import { Cliente } from '../../models/cliente.model';
import { LoggedClientService } from '../../services/logged-client/logged-client.service';
import { Subscription } from 'rxjs';

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

    constructor(private loggedClient: LoggedClientService) {
        this.sub = this.loggedClient.cliente$.subscribe(c => {
            this.user = c;
            this.balance = c?.saldo ?? 0;
        });
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
    }
}
