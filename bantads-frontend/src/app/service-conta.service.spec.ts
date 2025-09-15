import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { ServiceContaService } from './service-conta.service';

describe('ServiceContaService (mock auth)', () => {
  let service: ServiceContaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiceContaService);
    service.logout();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login with valid credentials', async () => {
    const result = await firstValueFrom(service.login('guilherme@bantads.com', 'guilherme'));
    expect(result.session.user).toBe('guilherme@bantads.com');
    expect(result.account.id).toBeTruthy();
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('should fail with wrong password', (done) => {
    service.login('leonardo@bantads.com', 'wrong').subscribe({
      next: () => done.fail('Should not succeed'),
      error: (err) => {
        expect(err).toBeTruthy();
        expect(service.isAuthenticated()).toBeFalse();
        done();
      }
    });
  });
});
