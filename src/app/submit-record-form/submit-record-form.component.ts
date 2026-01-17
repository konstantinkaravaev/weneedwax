import { Component, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NgZone } from '@angular/core';

import { environment } from '../../environments/environment';
import { RecaptchaService } from '../services/recaptcha.service';

@Component({
  selector: 'app-submit-record-form',
  templateUrl: './submit-record-form.component.html',
  styleUrls: ['./submit-record-form.component.scss'],
})
export class SubmitRecordFormComponent {
  @ViewChild('fileInput') fileInput!: ElementRef;
  recordForm: FormGroup;
  selectedFile: File | null = null;
  isProcessingFile = false;
  isSubmitting = false;
  fileError: string | null = null;
  submitError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private ngZone: NgZone,
    private recaptcha: RecaptchaService,
  ) {
    this.recordForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s().-]{7,}$/)]],
      title: ['', [Validators.required, Validators.minLength(2)]],
      artist: ['', [Validators.required, Validators.minLength(2)]],
      genre: ['', [Validators.required, Validators.minLength(2)]],
      year: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
      condition: ['', [Validators.required, Validators.minLength(2)]],
      price: [
        '',
        [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)],
      ],
      file: [null, Validators.required],
    });
  }

  async onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.fileError = null;

    if (input?.files && input.files.length > 0) {
      let file = input.files[0];
      this.isProcessingFile = true;

      try {
        const imageCompression = (await import('browser-image-compression'))
          .default;
        const heic2any = (await import('heic2any')).default;

        // HEIC to JPEG conversion
        if (
          file.type === 'image/heic' ||
          file.name.toLowerCase().endsWith('.heic')
        ) {
          const convertedBlob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
          });
          file = new File(
            [convertedBlob as Blob],
            file.name.replace(/\.heic$/, '.jpg'),
            {
              type: 'image/jpeg',
            },
          );
        }

        // Compression and resize
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1024,
          useWebWorker: true,
        });

        this.selectedFile = compressed;
        this.recordForm.get('file')?.setValue(this.selectedFile);
        console.log('File processed:', this.selectedFile);
      } catch (err) {
        console.error('File processing error:', err);
        this.fileError = 'Unable to process the file. Please try another image.';
        this.recordForm.get('file')?.setErrors({ processing: true });
        this.selectedFile = null;
      } finally {
        this.isProcessingFile = false;
      }
    } else {
      this.selectedFile = null;
      this.recordForm.get('file')?.setValue(null);
    }
  }

  async onSubmit() {
    this.submitError = null;

    if (!this.recordForm.valid || !this.selectedFile) {
      this.recordForm.markAllAsTouched();
      this.recordForm.get('file')?.setErrors({ required: true });
      console.log('Form is invalid');
      return;
    }

    const formData = new FormData();
    formData.append('fullName', this.recordForm.value.fullName);
    formData.append('email', this.recordForm.value.email);
    formData.append('phone', this.recordForm.value.phone);
    formData.append('title', this.recordForm.value.title);
    formData.append('artist', this.recordForm.value.artist);
    formData.append('genre', this.recordForm.value.genre);
    formData.append('year', this.recordForm.value.year);
    formData.append('condition', this.recordForm.value.condition);
    formData.append('price', this.recordForm.value.price);
    formData.append('file', this.selectedFile);

    console.log('Form Data Ready to Send:', formData);

    this.isSubmitting = true;

    try {
      const token = await this.recaptcha.execute('submit');
      formData.append('recaptchaToken', token);
    } catch (error) {
      console.error('reCAPTCHA error:', error);
      this.submitError =
        'Verification failed. Refresh the page and try again.';
      this.isSubmitting = false;
      return;
    }

    const uploadUrl = environment.apiBaseUrl
      ? `${environment.apiBaseUrl}/upload`
      : '/upload';

    this.http.post(uploadUrl, formData).subscribe({
      next: (response) => {
        console.log('Data sent successfully:', response);
        this.resetForm();
        this.ngZone.run(() => {
          this.router.navigate(['/submission-confirmation']);
        });
      },
      error: (error) => {
        console.error('Error sending data:', error);
        this.submitError =
          'Unable to submit the form. Check your connection and try again.';
        this.isSubmitting = false;
      },
      complete: () => {
        this.isSubmitting = false;
      },
    });
  }

  resetForm() {
    this.recordForm.reset();
    this.recordForm.markAsPristine();
    this.recordForm.markAsUntouched();
    this.recordForm.updateValueAndValidity();
    this.selectedFile = null;
    this.fileError = null;
    this.submitError = null;
    this.isProcessingFile = false;
    this.isSubmitting = false;

    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }
}
