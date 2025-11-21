import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { Cliente } from '../../models/cliente.model';
import { ClientService } from '../../services/client/client.service';
import { ServiceContaService } from '../../services/conta/service-conta.service';

@Component({
    selector: 'app-user-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './user-dashboard.component.html',
    styleUrl: './user-dashboard.component.css',
})
export class UserDashboardComponent implements OnInit {
    user: Cliente | null = null;
    balance: number = 0;
    isLoading = true;
    darkMode = false;

    constructor(private clientService: ClientService) {}

    ngOnInit(): void {
        this.darkMode = localStorage.getItem('dashboardDarkMode') === 'true';
        this.isLoading = true;

        this.clientService.getLoggedClient().subscribe({
            next: (cliente) => {
                this.user = cliente || null;
                if (this.user) {
                    this.balance = this.user.saldo || 0;
                }
                this.isLoading = false;
            },
            error: (err) => {
                console.error(err);
                this.isLoading = false;
            },
        });
    }
}
