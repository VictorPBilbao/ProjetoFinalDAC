import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { forkJoin, Subscription } from 'rxjs';

import { Manager } from '../../models/manager.model';
import { Cliente } from '../../models/cliente.model';
import { ClientService } from '../../services/client/client.service';
import { ManagerService } from '../../services/manager/manager.service';

@Component({
    selector: 'app-dashboard-admin',
    standalone: true,
    imports: [CommonModule, NgxChartsModule],
    templateUrl: './dashboard-admin.component.html',
    styleUrls: ['./dashboard-admin.component.css'],
})
export class DashboardAdminComponent implements OnInit, OnDestroy {
    managers: Manager[] = [];
    chartData: any[] = [];
    isLoading = true;
    private dataSubscription?: Subscription;

    colorScheme = {
        name: 'customScheme',
        selectable: true,
        group: ScaleType.Ordinal,
        domain: ['#0ec093', '#e53935'],
    };

    constructor(private managerService: ManagerService) {}

    ngOnInit(): void {
        this.loadDashboardData();
    }

    loadDashboardData(): void {
        this.isLoading = true;

        this.dataSubscription = this.managerService
            .getManagersWithTotals()
            .subscribe({
                next: (processedManagers) => {
                    this.managers = processedManagers.sort(
                        (a, b) =>
                            (b.positiveTotal ?? 0) - (a.positiveTotal ?? 0)
                    );

                    this.chartData = this.managers.map((m) => ({
                        name: m.name,
                        series: [
                            {
                                name: 'Saldo Positivo',
                                value: m.positiveTotal ?? 0,
                            },
                            {
                                name: 'Saldo Negativo',
                                value: Math.abs(m.negativeTotal ?? 0),
                            },
                        ],
                    }));

                    this.isLoading = false;
                },
                error: (err) => {
                    console.error('Erro ao carregar dados do dashboard:', err);
                    this.isLoading = false;
                },
            });
    }

    ngOnDestroy(): void {
        this.dataSubscription?.unsubscribe();
    }

    private safeNumber(value: any): number {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }
}
