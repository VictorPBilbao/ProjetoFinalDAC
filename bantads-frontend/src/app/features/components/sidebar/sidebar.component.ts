import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth.service'
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Cliente } from '../../models/cliente.model';
import { ClientService } from '../../services/client/client.service';

@Component({
  selector: 'app-sidebar',
  imports: [
    RouterLink,
    RouterLinkActive,
    CommonModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class MenuSidebarComponent {
  client: Cliente | null = null;
  searchTerm : string = '';
  sidebarVisible: boolean = true;
  clientLinksVisible: boolean = false;
  adminLinksVisible: boolean = false;
  managerLinksVisible: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private clientService: ClientService
  ) {}

  ngOnInit(): void {
    this.checkScreenSize(); // Verifica o tamanho da tela ao carregar o componente

    this.client = { nome: this.authService.getUser().user } as Cliente;

    var roleUser = this.authService.getUserRole();

    if(roleUser === 'cliente') {
        this.clientLinksVisible = true;
    } else if (roleUser === 'admin') {
        this.adminLinksVisible = true;
    } else if (roleUser === 'gerente') {
        this.managerLinksVisible = true;
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.checkScreenSize(); // Verifica o tamanho da tela ao redimensionar
  }

  checkScreenSize(): void {
    const sidebar = document.querySelector('.sidebar') as HTMLElement;

    if (window.innerWidth < 768) {
      this.sidebarVisible = false; // Define o estado como fechado
      sidebar.classList.add('close');
      sidebar.classList.remove('open');
    } else {
      this.sidebarVisible = true; // Define o estado como aberto
      sidebar.classList.add('open');
      sidebar.classList.remove('close');
    }
  }

  getUserInitals(): string {
    if (!this.client?.nome) return '';
    return (this.client?.nome)
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase();
  }

  openSidebar(): void {
    this.sidebarVisible = !this.sidebarVisible;
    const sidebar = document.querySelector('.sidebar') as HTMLElement;
    const textsSidebar = document.querySelectorAll('.nav-link-text') as NodeListOf<HTMLElement>;
    const menuUserName = document.querySelector('.menu-user-name') as HTMLElement;
    const menuSearchContainer = document.querySelector('.menu-search-container') as HTMLElement;
    const menuPaddings = document.querySelectorAll('.menu-padding') as NodeListOf<HTMLElement>;
    const initialsContainer = document.querySelector('.menu-name-initials-container') as HTMLElement;

    // Alterna entre classes 'open' e 'close'
    const isOpening = !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', isOpening);
    sidebar.classList.toggle('close', !isOpening);

    // Aplica estilos diretamente
    textsSidebar.forEach(text => {
      text.style.display = isOpening ? 'flex' : 'none';
    });

    // Aplica no menu user/search
    menuUserName.style.display = isOpening ? 'block' : 'none';
    menuSearchContainer.style.display = isOpening ? 'block' : 'none';
    menuPaddings.forEach(el => {
      el.style.padding = isOpening ? '15px 20px' : '14px';
    });
    initialsContainer.style.width = isOpening ? '40px' : '30px';
    initialsContainer.style.height = isOpening ? '40px' : '30px';
    initialsContainer.style.marginTop = isOpening ? '0px' : '50px';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
