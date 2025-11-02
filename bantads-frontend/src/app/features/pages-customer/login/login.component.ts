import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
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

    partners: string[] = [
        'images/image-30.png',
        'images/image-40.png',
        'images/image-50.png',
        'images/image-60.png',
        'images/partner-7.png',
        'images/partner-8.png'
    ];

    currentIndex = 0;
    intervalo: any;

    @ViewChild('partnersRef', { static: true }) partnersRef!: ElementRef<HTMLDivElement>;
    intervaloPartners: any;

    constructor(private router: Router) { }

    ngOnInit(): void {
        this.iniciarCarrosselAutomatico();
        this.iniciarCarrosselAutomaticoPartners();

    }

    ngOnDestroy(): void {
        clearInterval(this.intervalo);
        clearInterval(this.intervaloPartners);
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

    iniciarCarrosselAutomaticoPartners(): void {

        const tempo = 3000;

        clearInterval(this.intervaloPartners);

        this.intervaloPartners = setInterval(() => {
            this.proximoPartnerAutoScroll();
        }, tempo);
    }

     proximoPartnerAutoScroll(): void {
        const container = this.partnersRef?.nativeElement;
        if (!container) {
            return;
        }

        const firstImg = container.querySelector('img') as HTMLImageElement | null;
        let larguraImg = 0;

        if (firstImg) {

            const rect = firstImg.getBoundingClientRect();
            larguraImg = rect.width;

            if (larguraImg === 0) {
                larguraImg = 140;
            }
        } else {

            return;
        }

        const gapApprox = 32;
        const deslocamento = Math.round(larguraImg + gapApprox);

        const maxScrollLeft = container.scrollWidth - container.clientWidth;

        if (container.scrollLeft + deslocamento >= maxScrollLeft - 1) {
            container.scrollTo({ left: maxScrollLeft, behavior: 'smooth' });
            setTimeout(() => {
                container.scrollTo({ left: 0 });
            }, 700);
        } else {
            container.scrollBy({ left: deslocamento, behavior: 'smooth' });
        }
    }

    reiniciarAutoScrollPartners(): void {
        clearInterval(this.intervaloPartners);
        this.iniciarCarrosselAutomaticoPartners();
    }
}
