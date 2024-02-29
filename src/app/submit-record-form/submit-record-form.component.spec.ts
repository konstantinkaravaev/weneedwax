import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SubmitRecordFormComponent } from './submit-record-form.component';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';

describe('SubmitRecordFormComponent', () => {
  let component: SubmitRecordFormComponent;
  let fixture: ComponentFixture<SubmitRecordFormComponent>;
  let mockHttpClient: any;

  beforeEach(async () => {
    mockHttpClient = {
      post: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        HttpClientTestingModule,
        RouterTestingModule,
        NoopAnimationsModule,
        MatFormFieldModule, // Добавьте этот импорт
        MatInputModule, // Добавьте этот импорт, если вы используете <input matInput>
        BrowserAnimationsModule,
        NoopAnimationsModule,
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
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate form fields', () => {
    console.log('start');

    const form = component.recordForm;
    const titleControl = form.get('title');
    const artistControl = form.get('artist');

    titleControl?.setValue('');
    artistControl?.setValue('');

    expect(form.valid).toBeFalsy();
    expect(titleControl?.errors).toBeTruthy();
    expect(artistControl?.errors).toBeTruthy();

    console.log('end');
  });

  it('should not submit the form if it is invalid', () => {
    console.log('start');

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

    console.log('end');
  });

  it('should submit the form if it is valid', () => {
    console.log('valid test start');

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

    console.log('valid test END');
  });
});

//   // it('should navigate to submission confirmation page after successful form submission', () => {
//   //   const form = component.recordForm;
//   //   form.setValue({
//   //     title: 'Test Title',
//   //     artist: 'Test Artist',
//   //     genre: 'Test Genre',
//   //     year: '2000',
//   //     condition: 'Test Condition',
//   //     price: '10.00',
//   //     image: null,
//   //   });

//   //   mockHttpClient.post.mockReturnValue(of({}));
//   //   component.onSubmit();
//   //   expect(mockRouter.navigate).toHaveBeenCalledWith([
//   //     '/submission-confirmation',
//   //   ]);
//   // });

//   // it('should reset the form after successful submission', () => {
//   //   const form = component.recordForm;
//   //   form.setValue({
//   //     title: 'Test Title',
//   //     artist: 'Test Artist',
//   //     genre: 'Test Genre',
//   //     year: '2000',
//   //     condition: 'Test Condition',
//   //     price: '10.00',
//   //     image: null,
//   //   });

//   //   mockHttpClient.post.mockReturnValue(of({}));
//   //   component.onSubmit();
//   //   expect(form.pristine).toBeTruthy();
//   // });

//   // Добавьте другие тесты здесь, например, для проверки onFileChange
// });
