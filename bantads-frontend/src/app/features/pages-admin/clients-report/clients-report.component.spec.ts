import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientsReportComponent } from './clients-report.component';

describe('ClientsReportComponent', () => {
  let component: ClientsReportComponent;
  let fixture: ComponentFixture<ClientsReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientsReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientsReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
