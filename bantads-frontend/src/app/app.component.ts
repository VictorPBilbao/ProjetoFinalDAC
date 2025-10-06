import { Component, OnInit } from '@angular/core';
import { HeaderComponent } from './features/components/header/header.component';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { CommonModule } from '@angular/common';
import { LoadingComponent } from './features/components/utils/loading/loading.component';
import { MenuSidebarComponent } from './features/components/sidebar/sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    LoadingComponent,
    HeaderComponent,
    MenuSidebarComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'bantads-frontend';
  showHeader = false;

  constructor(
    private router: Router
) {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {

      if (event.url === '/login' || event.url === '/') {
        this.showHeader = true;
      } else {
        this.showHeader = false;
      }
    });
  }

  showSidebar(): boolean {
    const url = this.router.url;
    return (
      url.startsWith('/cliente') ||
      url.startsWith('/gerente') ||
      url.startsWith('/admin')
    );
  }
}
