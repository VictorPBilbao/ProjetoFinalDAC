import { DecimalPipe, NgStyle } from '@angular/common';
import { Component } from '@angular/core';

import { Cliente } from '../../models/cliente.model';
import { AuthService } from '../../services/auth/auth.service';

@Component({
    selector: 'app-user-dashboard',
    imports: [NgStyle, DecimalPipe],
    templateUrl: './user-dashboard.component.html',
    styleUrl: './user-dashboard.component.css',
})
export class UserDashboardComponent {
    user!: Cliente;
    balance!: number;
    // monthlyDeposit!: number;

    constructor(private authService: AuthService) {
        this.user = authService.getUser();
        this.balance = this.user.saldo ? this.user.saldo : 0;
        console.log(this.user);
    }
}
