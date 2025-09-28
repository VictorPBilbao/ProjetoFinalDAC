
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { Cliente } from '../../models/cliente.model';
import { Manager } from '../../models/manager.model';
import { LoggedClientService } from '../../services/logged-client/logged-client.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-deposito',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './deposito.component.html',
  styleUrls: ['./deposito.component.css'] 
})
export class DepositoComponent {
  cliente$!: Observable<Cliente | null>;

  constructor(private loggedClientService: LoggedClientService) {
    this.cliente$ = this.loggedClientService.cliente$;
  }
}
