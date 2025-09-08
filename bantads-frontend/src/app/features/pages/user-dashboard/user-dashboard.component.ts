import { Component } from '@angular/core';

import { StatementItemComponent } from '../../components/ui/statement-item/statement-item.component';

@Component({
  selector: 'app-user-dashboard',
  imports: [StatementItemComponent],
  templateUrl: './user-dashboard.component.html',
  styleUrl: './user-dashboard.component.css',
})
export class UserDashboardComponent {}
