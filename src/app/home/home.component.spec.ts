import { Component } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { RouterTestingModule } from '@angular/router/testing';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';

@Component({ template: '' })
class DummyComponent {}

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HomeComponent, DummyComponent],
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'submit-record/offer', component: DummyComponent },
        ]),
        MatButtonModule,
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
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

  it('should call suggestRecords() when the "Suggest Your Records" button is clicked', waitForAsync(() => {
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    const button = fixture.debugElement.nativeElement.querySelector('button');
    button.click();
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(navigateSpy).toHaveBeenCalledWith(['/submit-record/offer']);
    });
  }));

  it('should handle navigation errors', waitForAsync(() => {
    const navigateSpy = jest
      .spyOn(router, 'navigate')
      .mockRejectedValue(new Error('Navigation Error'));
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const button = fixture.debugElement.nativeElement.querySelector('button');
    button.click();
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(navigateSpy).toHaveBeenCalledWith(['/submit-record/offer']);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Navigation Error',
        new Error('Navigation Error')
      );
    });
  }));
});
