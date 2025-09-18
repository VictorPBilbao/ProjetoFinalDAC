import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-manager-details',
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './manager-details.component.html',
  styleUrl: './manager-details.component.css'
})
export class ManagerDetailsComponent {

}
