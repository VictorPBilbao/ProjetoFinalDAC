import { Component, OnInit, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Cliente } from '../../models/cliente.model';
import { ClientService } from '../../services/client/client.service';

@Component({
  selector: 'app-list-clients',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './list-clients.component.html',
  styleUrl: './list-clients.component.css',
})
export class ListClientsComponent implements OnInit {
  private allClients: Cliente[] = [];
  filteredClients: Cliente[] = [];
  pgClients: Cliente[] = [];

  search: string = '';

  currentPg: number = 1;
  itmsPerPg: number = 7;
  totalPgs: number = 0;

  // Modal state
  modalOpen = false;
  selectedClient?: Cliente;

  constructor(private clientService: ClientService) {
    this.allClients = this.clientService.getClients();
  }

  ngOnInit(): void {
    this.allClients.sort((a, b) => a.nome.localeCompare(b.nome));
    this.filterClients();
  }

  filterClients(): void {
    const keyword = this.search.toLowerCase().trim();
    if (!keyword) {
      this.filteredClients = [...this.allClients];
    } else {
      this.filteredClients = this.allClients.filter(
        (client) =>
          client.nome.toLowerCase().includes(keyword) ||
          client.cpf.replace(/[.-]/g, '').includes(keyword.replace(/[.-]/g, ''))
      );
    }
    this.currentPg = 1;
    this.updatePgView();

    // Se houver apenas 1 resultado, abre modal com detalhes
    if (this.filteredClients.length === 1) {
      this.openModal(this.filteredClients[0]);
    } else if (this.modalOpen && this.selectedClient && !this.filteredClients.find(c => c.id === this.selectedClient!.id)) {
      // Se o cliente selecionado não está mais no filtro, fecha modal
      this.closeModal();
    }
  }

  updatePgView() {
    this.totalPgs = Math.ceil(this.filteredClients.length / this.itmsPerPg);
    if (this.currentPg > this.totalPgs && this.totalPgs > 0) {
      this.currentPg = this.totalPgs;
    }
    const start = (this.currentPg - 1) * this.itmsPerPg;
    const end = start + this.itmsPerPg;
    this.pgClients = this.filteredClients.slice(start, end);
  }

  goToPg(pg: number) {
    if (pg >= 1 && pg <= this.totalPgs) {
      this.currentPg = pg;
      this.updatePgView();
    }
  }

  nextPg() {
    this.goToPg(this.currentPg + 1);
  }

  previousPg() {
    this.goToPg(this.currentPg - 1);
  }

  openModal(cliente: Cliente) {
    this.selectedClient = cliente;
    this.modalOpen = true;
  }

  closeModal() {
    this.modalOpen = false;
    this.selectedClient = undefined;
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.modalOpen) this.closeModal();
  }
}
