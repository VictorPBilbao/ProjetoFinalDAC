import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WhithdrawalComponent } from './whithdrawal.component';

describe('WhithdrawalComponent', () => {
  let component: WhithdrawalComponent;
  let fixture: ComponentFixture<WhithdrawalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
  imports: [WhithdrawalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WhithdrawalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
