import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { RouterTestingModule } from '@angular/router/testing';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { Component } from '@angular/core';
import { SubmitRecordFormComponent } from '../submit-record-form/submit-record-form.component';

// @Component({ template: '' })
// class DummyComponent {}

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HomeComponent, SubmitRecordFormComponent],
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'submit-record', component: SubmitRecordFormComponent },
        ]),
        MatButtonModule,
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate');

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the greeting message', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.greeting').textContent).toContain(
      'Hey, We Need Wax'
    );
  });

  it('should call suggestRecords() when the "Suggest Your Records" button is clicked', () => {
    const button = fixture.debugElement.nativeElement.querySelector('button');
    button.click();
    fixture.detectChanges();
    expect(router.navigate).toHaveBeenCalledWith(['/submit-record']);
  });
});
