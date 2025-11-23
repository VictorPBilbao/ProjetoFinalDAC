import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';

import { ManagerService } from '../manager/manager.service';

@Injectable({
    providedIn: 'root',
})
export class DashboardAdminService {
    constructor(private managerService: ManagerService) {}

    getDashboardData(): Observable<any> {
        return this.managerService.getManagersWithTotals();
    }
}
