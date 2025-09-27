import { Injectable } from '@angular/core';
import { Manager } from '../../models/manager.model';
import { Cliente } from '../../models/cliente.model';
import { LocalStorageServiceService } from '../../services/local-storages/local-storage-service.service';

@Injectable({
  providedIn: 'root',
})
export class DashboardAdminService {

  constructor(private storage: LocalStorageServiceService) {}

  getManagers(): Manager[] {
    return this.storage.getManagers();
  }

  getClients(): Cliente[] {
    return this.storage.getClientes();
  }

  getManagersWithClients(): Manager[] {
    const managers = this.getManagers();
    const clients = this.getClients();

    managers.forEach(manager => {
      manager.clients = clients.filter(c => c.manager?.id === manager.id);
      manager.clientCount = manager.clients.length;
      manager.positiveTotal = manager.clients
        .filter(c => c.saldo > 0)
        .reduce((sum, c) => sum + c.saldo, 0);
      manager.negativeTotal = manager.clients
        .filter(c => c.saldo < 0)
        .reduce((sum, c) => sum + c.saldo, 0);
    });

    return managers;
  }
}
