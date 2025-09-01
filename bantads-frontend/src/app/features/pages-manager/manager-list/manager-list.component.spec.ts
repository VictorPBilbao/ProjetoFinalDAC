import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagerListComponent } from './manager-list.component';

describe('ManagerListComponent', () => {
  let component: ManagerListComponent;
  let fixture: ComponentFixture<ManagerListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagerListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManagerListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
