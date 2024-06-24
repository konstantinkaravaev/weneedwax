import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { SubmitRecordFormComponent } from './submit-record-form.component';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { SubmissionConfirmationComponent } from '../submission-confirmation/submission-confirmation.component';

describe('SubmitRecordFormComponent', () => {
  let component: SubmitRecordFormComponent;
  let fixture: ComponentFixture<SubmitRecordFormComponent>;
  let mockHttpClient: any;
  let router: Router;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    mockHttpClient = {
      post: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([
          { path: 'submit-record', component: SubmitRecordFormComponent },
          {
            path: 'submission-confirmation',
            component: SubmissionConfirmationComponent,
          },
        ]),
        NoopAnimationsModule,
        MatFormFieldModule,
        MatInputModule,
        BrowserAnimationsModule,
        MatButtonModule,
      ],
      declarations: [SubmitRecordFormComponent],
      providers: [
        FormBuilder,
        { provide: HttpClient, useValue: mockHttpClient },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SubmitRecordFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpTestingController = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate form fields', () => {
    const form = component.recordForm;
    const titleControl = form.get('title');
    const artistControl = form.get('artist');

    titleControl?.setValue('');
    artistControl?.setValue('');

    expect(form.valid).toBeFalsy();
    expect(titleControl?.errors).toBeTruthy();
    expect(artistControl?.errors).toBeTruthy();
  });

  it('should not submit the form if it is invalid', () => {
    const form = component.recordForm;
    form.setValue({
      title: '',
      artist: '',
      genre: '',
      year: '',
      condition: '',
      price: '',
      image: null,
    });

    expect(form.valid).toBeFalsy();

    component.onSubmit();
    expect(mockHttpClient.post).not.toHaveBeenCalled();
  });

  it('should submit the form if it is valid', () => {
    const form = component.recordForm;
    form.setValue({
      title: 'Test Title',
      artist: 'Test Artist',
      genre: 'Test Genre',
      year: '2000',
      condition: 'Test Condition',
      price: '10.00',
      image: null,
    });

    expect(form.valid).toBeTruthy();

    mockHttpClient.post.mockImplementation(() => of({}));
    component.onSubmit();
    expect(mockHttpClient.post).toHaveBeenCalled();
  });

  it('should reset the form after successful submission', () => {
    const form = component.recordForm;
    form.setValue({
      title: 'Test Title',
      artist: 'Test Artist',
      genre: 'Test Genre',
      year: '2000',
      condition: 'Test Condition',
      price: '10.00',
      image: null,
    });

    mockHttpClient.post.mockReturnValue(of({}));
    component.onSubmit();
    expect(form.pristine).toBeTruthy();
  });

  it('should navigate to submission confirmation page after successful form submission', fakeAsync(() => {
    const form = component.recordForm;
    form.setValue({
      title: 'Test Title',
      artist: 'Test Artist',
      genre: 'Test Genre',
      year: '2000',
      condition: 'Test Condition',
      price: '10.00',
      image: null,
    });

    mockHttpClient.post.mockReturnValue(of({}));
    component.onSubmit();
    fixture.detectChanges();

    tick(); // Убедитесь, что все асинхронные операции завершены

    expect(router.navigate).toHaveBeenCalledWith(['/submission-confirmation']);
  }));
});
