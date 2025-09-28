import { Injectable } from '@angular/core';
import { Cliente } from '../../models/cliente.model';
import { LocalStorageServiceService } from '../../services/local-storages/local-storage-service.service';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class ClientService {
    constructor(private storage: LocalStorageServiceService) {}

    getClients(): Observable<Cliente[]> {
        return of(this.storage.getClientes()).pipe(delay(500));
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
