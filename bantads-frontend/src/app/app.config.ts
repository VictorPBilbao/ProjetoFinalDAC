import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
    provideHttpClient,
    withInterceptors,
    HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';

import { routes } from './app.routes';
import { AuthService } from './features/services/auth/auth.service';

const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const token = authService.getToken();

    if (token) {
        const authHeader = token.startsWith('Bearer ')
            ? token
            : `Bearer ${token}`;

        const clonedReq = req.clone({
            headers: req.headers.set('Authorization', authHeader),
        });
        return next(clonedReq);
    }

    return next(req);
};

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),

        provideHttpClient(withInterceptors([authInterceptor])),
    ],
};
