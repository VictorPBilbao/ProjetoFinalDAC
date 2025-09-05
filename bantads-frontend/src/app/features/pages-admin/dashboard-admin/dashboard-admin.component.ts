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
  managers: Manager[] = []; // List of managers with their clients
  chartData: any[] = []; // Data for the chart
  colorScheme = {
    name: 'customScheme',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#43a047', '#e53935']  // Green for positive, Red for negative
  };

  constructor(private dashboardService: DashboardAdminService) { }

  ngOnInit(): void {
    this.loadManagers(); // Load managers and their clients on component initialization
  }

  private safeNumber(value: any): number { // Utility to safely convert to number
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  loadManagers() {

    this.managers = this.dashboardService.getManagersWithClients(); // Fetch managers with their clients

    // Calculate totals and client counts for each manager
    this.managers.forEach(manager => {
      manager.clients = manager.clients || []; // Ensure clients array is defined
      manager.clientCount = manager.clients.length; // Total number of clients
      manager.positiveTotal = manager.clients.reduce((acc, cli) => acc + (this.safeNumber(cli.saldo) >= 0 ? this.safeNumber(cli.saldo) : 0), 0); // Sum of positive balances
      manager.negativeTotal = manager.clients.reduce((acc, cli) => acc + (this.safeNumber(cli.saldo) < 0 ? this.safeNumber(cli.saldo) : 0), 0); // Sum of negative balances
    });

    this.managers.sort((a, b) => (this.safeNumber(b.positiveTotal)) - (this.safeNumber(a.positiveTotal))); // Sort managers by positive total descending
    // Prepare chart data
    this.chartData = this.managers.map(m => ({
      name: m.name,
      series: [
        { name: 'Saldo Positivo', value: this.safeNumber(m.positiveTotal) }, // Positive balance
        { name: 'Saldo Negativo', value: Math.abs(this.safeNumber(m.negativeTotal)) } // Negative balance as positive value
      ]
    }));
  }
}