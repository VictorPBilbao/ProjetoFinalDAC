import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { Manager } from '../../models/manager.model';
import { Cliente } from '../../models/cliente.model';
import { DashboardAdminService } from '../../services/dashboard-admin.service';
import { ScaleType } from '@swimlane/ngx-charts';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, NgxChartsModule],
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.css']
})
export class DashboardAdminComponent implements OnInit {
  managers: Manager[] = [];
  chartData: any[] = [];
  colorScheme = {
    name: 'customScheme',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#43a047', '#e53935']  // Green for positive, Red for negative
  };

  constructor(private dashboardService: DashboardAdminService) { }

  ngOnInit(): void {
    this.loadManagers();
  }

  private safeNumber(value: any): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  loadManagers() {

    this.managers = this.dashboardService.getManagersWithClients();

    this.managers.forEach(manager => {
      manager.clients = manager.clients || [];
      manager.clientCount = manager.clients.length;
      manager.positiveTotal = manager.clients.reduce((acc, cli) => acc + (this.safeNumber(cli.saldo) >= 0 ? this.safeNumber(cli.saldo) : 0), 0);
      manager.negativeTotal = manager.clients.reduce((acc, cli) => acc + (this.safeNumber(cli.saldo) < 0 ? this.safeNumber(cli.saldo) : 0), 0);
    });

    this.managers.sort((a, b) => (this.safeNumber(b.positiveTotal)) - (this.safeNumber(a.positiveTotal)));

    this.chartData = this.managers.map(m => ({
      name: m.name,
      series: [
        { name: 'Saldo Positivo', value: this.safeNumber(m.positiveTotal) },
        { name: 'Saldo Negativo', value: Math.abs(this.safeNumber(m.negativeTotal)) }
      ]
    }));
  }
}