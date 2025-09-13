import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Cliente } from '../../models/cliente.model';
import { ClientService } from '../../services/client.service';

@Component({
  selector: 'app-clients-report',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './clients-report.component.html',
  styleUrl: './clients-report.component.css',
})
export class ClientsReportComponent implements OnInit {
  private allClients: Cliente[] = [];
  filteredClients: Cliente[] = [];
  pgClients: Cliente[] = [];

  search: string = '';

  currentPg: number = 1;
  itmsPerPg: number = 7;
  totalPgs: number = 0;

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
}
