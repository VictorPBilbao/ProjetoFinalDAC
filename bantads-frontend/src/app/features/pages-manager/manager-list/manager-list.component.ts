import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { from } from 'rxjs';

@Component({
  selector: 'app-manager-list',
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './manager-list.component.html',
  styleUrl: './manager-list.component.css'
})
export class ManagerListComponent {

}
