import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit, OnDestroy {

  heroImages: string[] = [
    'images/car.jpg',
    'images/house.jpg',
    'images/happy.jpg',
    'images/new-home.jpg'
  ];

  currentIndex = 0;
  intervalo: any;

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.iniciarCarrosselAutomatico();
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalo);
  }

  iniciarCarrosselAutomatico(): void {
    this.intervalo = setInterval(() => {
      this.proximoSlide();
    }, 5000);
  }

  proximoSlide(): void {
    this.currentIndex = (this.currentIndex + 1) % this.heroImages.length;
  }

  anteriorSlide(): void {
    this.currentIndex = (this.currentIndex - 1 + this.heroImages.length) % this.heroImages.length;
  }

  irParaSlide(index: number): void {
    this.currentIndex = index;
  }

  abrirCadastro() {
    this.router.navigate(['/cadastro']);
  }
}
