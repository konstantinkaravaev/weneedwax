import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmitRecordFormComponent } from './submit-record-form.component';

describe('SubmitRecordFormComponent', () => {
  let component: SubmitRecordFormComponent;
  let fixture: ComponentFixture<SubmitRecordFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SubmitRecordFormComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubmitRecordFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
