import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Manager } from '../../models/manager.model';
import { ManagerService } from '../../services/manager/manager.service';

@Component({
  selector: 'app-manager-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './manager-list.component.html',
  styleUrls: ['./manager-list.component.css']
})
export class ManagerListComponent implements OnInit {
  managers: Manager[] = [];

  constructor(
    private managerService: ManagerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadManagers();
  }

  loadManagers(): void {
    this.managerService.getManagers().subscribe((data: Manager[]) => {
      this.managers = data;
    });
  }

  deleteManager(managerId: string): void {
    this.managerService.deleteManager(managerId).subscribe(() => {
      // Recarrega a lista depois de deletar
      this.loadManagers();
    });
  }
}
