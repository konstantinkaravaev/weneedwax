import { ComponentFixture, TestBed } from '@angular/core/testing';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { SubmissionConfirmationComponent } from '../submission-confirmation/submission-confirmation.component';
import { RecaptchaService } from '../services/recaptcha.service';

describe('SubmitRecordFormComponent', () => {
  let component: SubmitRecordFormComponent;
  let fixture: ComponentFixture<SubmitRecordFormComponent>;
  let mockHttpClient: any;
  let mockRecaptcha: any;
  let router: Router;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    mockHttpClient = {
      post: jest.fn(),
    };
    mockRecaptcha = {
      execute: jest.fn().mockResolvedValue('test-token'),
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
        MatProgressSpinnerModule,
      ],
      declarations: [SubmitRecordFormComponent],
      providers: [
        FormBuilder,
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: RecaptchaService, useValue: mockRecaptcha },
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
      fullName: '',
      email: '',
      phone: '',
      title: '',
      artist: '',
      genre: '',
      year: '',
      condition: '',
      price: '',
      file: null,
    });

    expect(form.valid).toBeFalsy();

    component.onSubmit();
    expect(mockHttpClient.post).not.toHaveBeenCalled();
  });

  it('should submit the form if it is valid', async () => {
    const form = component.recordForm;
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    form.setValue({
      fullName: 'Test Name',
      email: 'test@example.com',
      phone: '+1 555 123 4567',
      title: 'Test Title',
      artist: 'Test Artist',
      genre: 'Test Genre',
      year: '2000',
      condition: 'Test Condition',
      price: '10.00',
      file,
    });

    expect(form.valid).toBeTruthy();

    component.selectedFile = file;
    mockHttpClient.post.mockImplementation(() => of({}));
    await component.onSubmit();
    expect(mockHttpClient.post).toHaveBeenCalled();
  });

  it('should reset the form after successful submission', async () => {
    const form = component.recordForm;
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    form.setValue({
      fullName: 'Test Name',
      email: 'test@example.com',
      phone: '+1 555 123 4567',
      title: 'Test Title',
      artist: 'Test Artist',
      genre: 'Test Genre',
      year: '2000',
      condition: 'Test Condition',
      price: '10.00',
      file,
    });

    component.selectedFile = file;
    mockHttpClient.post.mockReturnValue(of({}));
    await component.onSubmit();
    expect(form.pristine).toBeTruthy();
  });

  it('should navigate to submission confirmation page after successful form submission', async () => {
    const form = component.recordForm;
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    form.setValue({
      fullName: 'Test Name',
      email: 'test@example.com',
      phone: '+1 555 123 4567',
      title: 'Test Title',
      artist: 'Test Artist',
      genre: 'Test Genre',
      year: '2000',
      condition: 'Test Condition',
      price: '10.00',
      file,
    });

    component.selectedFile = file;
    mockHttpClient.post.mockReturnValue(of({}));
    await component.onSubmit();
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/submission-confirmation']);
  });
});
