import { Injectable } from '@angular/core';
import { Cliente } from '../../models/cliente.model';
import { LocalStorageServiceService } from '../../services/local-storages/local-storage-service.service';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';

@Injectable({
    providedIn: 'root',
})
export class ClientService {
    constructor(
        private storage: LocalStorageServiceService,
        private authService: AuthService
    ) {}

    getLoggedClient(): Cliente | undefined {
        const user = this.authService.getUser();
        if (user && user.role === 'cliente') {
            return this.storage.getClienteByUsername(user.user);
        }

        return undefined;
    }

    getLastAccess(): string {
        const user = this.authService.getUser();
        return user?.lastAccess;
    }

    getClients(): Observable<Cliente[]> {
        const clientes = this.storage.getClientes();
        const managers = this.storage.getManagers();

        const managerMap = new Map(managers.map((m) => [m.id, m]));

        const populatedClients = clientes.map((cliente) => {
            const managerId = (cliente.manager as any)?.id;

            if (managerId && managerMap.has(managerId)) {
                cliente.manager = managerMap.get(managerId)!;
            }
            return cliente;
        });

        return of(populatedClients).pipe(delay(500));
    }

    getClientById(id: string): Observable<Cliente | undefined> {
        const client = this.storage.getClientes().find((c) => c.id === id);
        return of(client).pipe(delay(500));
    }

    addClient(newClient: Omit<Cliente, 'id' | 'criadoEm'>): Observable<any> {
        // Gera ID e criadoEm no LocalStorageService
        this.storage.addCliente({
            ...newClient,
            id: Date.now().toString(),
            criadoEm: new Date().toISOString(),
        });
        return of({
            success: true,
            message: 'Cliente criado com sucesso!',
        }).pipe(delay(500));
    }

    updateClient(updatedClient: Cliente): Observable<any> {
        this.storage.updateCliente(updatedClient);
        return of({
            success: true,
            message: 'Cliente atualizado com sucesso!',
        }).pipe(delay(500));
    }

    deleteClient(clientId: string): Observable<any> {
        this.storage.deleteCliente(clientId);
        return of({
            success: true,
            message: 'Cliente removido com sucesso!',
        }).pipe(delay(500));
    }
}
