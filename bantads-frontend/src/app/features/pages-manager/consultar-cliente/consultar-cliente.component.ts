import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Cliente } from '../../models/cliente.model';
import { DashboardAdminService } from '../../services/dashboard-admin.service';

@Component({
  selector: 'app-consultar-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consultar-cliente.component.html',
  styleUrls: ['./consultar-cliente.component.css']
})
export class ConsultarClienteComponent implements OnInit {
  searchTerm: string = '';
  clients: Cliente[] = [];
  filteredClients: Cliente[] = [];
  selectedClient?: Cliente;
  loading = false;
  notFound = false;
  defaultDate = new Date().toISOString();

  constructor(private dashboardAdminService: DashboardAdminService) {}

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.clients = this.dashboardAdminService.getClients();
    this.filteredClients = [...this.clients];
  }

  normalizeCpf(value: string): string {
    return value.replace(/\D/g, '');
  }

  onSearch(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredClients = [...this.clients];
      this.selectedClient = undefined;
      this.notFound = false;
      return;
    }
    // Busca por cpf, nome, email ou conta
    this.filteredClients = this.clients.filter(c => {
      const cpf = this.normalizeCpf(c.cpf);
      const termDigits = this.normalizeCpf(term);
      return (
        c.nome.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        cpf.includes(termDigits) ||
        c.conta?.toLowerCase().includes(term) ||
        c.id === term
      );
    });
    this.notFound = this.filteredClients.length === 0;
    if (this.filteredClients.length === 1) {
      this.selectClient(this.filteredClients[0]);
    } else {
      this.selectedClient = undefined;
    }
  }

  selectClient(c: Cliente): void {
    this.selectedClient = c;
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filteredClients = [...this.clients];
    this.selectedClient = undefined;
    this.notFound = false;
  }
}
