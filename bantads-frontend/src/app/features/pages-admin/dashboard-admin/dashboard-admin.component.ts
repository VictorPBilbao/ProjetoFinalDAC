import { forkJoin, Subscription } from 'rxjs';

import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';

import { Cliente } from '../../models/cliente.model';
import { Manager } from '../../models/manager.model';
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
                    console.log('Dados recebidos:', processedManagers);

                    this.managers = (processedManagers || [])
                        .filter(
                            (m): m is Manager =>
                                m !== null && m !== undefined && !!m.nome
                        )
                        .map(
                            (m) =>
                                ({
                                    ...m,
                                    name: m.nome || 'Desconhecido',
                                    positiveTotal: this.safeNumber(
                                        m.positiveTotal
                                    ),
                                    negativeTotal: this.safeNumber(
                                        m.negativeTotal
                                    ),
                                    clientCount: this.safeNumber(m.clientCount),
                                } as Manager)
                        )
                        .sort((a, b) => {
                            const aTotal = this.safeNumber(a.positiveTotal);
                            const bTotal = this.safeNumber(b.positiveTotal);
                            return bTotal - aTotal;
                        });

                    // ✅ Prepara dados do gráfico com validação extra
                    this.chartData = this.managers
                        .filter((m) => m.nome && m.nome.trim() !== '')
                        .map((m) => {
                            const positiveValue = this.safeNumber(
                                m.positiveTotal
                            );
                            const negativeValue = this.safeNumber(
                                m.negativeTotal
                            );

                            return {
                                name: m.nome,
                                series: [
                                    {
                                        name: 'Saldo Positivo',
                                        value: Math.max(0, positiveValue),
                                    },
                                    {
                                        name: 'Saldo Negativo',
                                        value: Math.abs(negativeValue),
                                    },
                                ],
                            };
                        });

                    console.log('Chart data preparado:', this.chartData);
                    this.isLoading = false;
                },
                error: (err) => {
                    console.error('Erro ao carregar dados do dashboard:', err);
                    this.managers = [];
                    this.chartData = [];
                    this.isLoading = false;
                },
            });
    }

    private safeNumber(value: any): number {
        if (value === null || value === undefined) return 0;
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }

    ngOnDestroy(): void {
        this.dataSubscription?.unsubscribe();
    }
}
