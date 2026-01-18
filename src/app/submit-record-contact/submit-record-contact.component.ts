import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NgZone } from '@angular/core';

import { environment } from '../../environments/environment';
import { RecaptchaService } from '../services/recaptcha.service';
import { RecordSubmissionService } from '../services/record-submission.service';

@Component({
  selector: 'app-submit-record-contact',
  templateUrl: './submit-record-contact.component.html',
  styleUrls: ['./submit-record-contact.component.scss'],
})
export class SubmitRecordContactComponent implements OnInit {
  contactForm!: FormGroup;
  isSubmitting = false;
  submitError: string | null = null;
  private readonly isLocalEnv =
    !environment.production &&
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1'].includes(window.location.hostname);

  private hintTimers: Record<string, ReturnType<typeof setTimeout> | null> = {};
  private hintVisible: Record<string, boolean> = {};
  private readonly minHintLength = 3;
  private readonly hintDelays: Record<string, number> = {
    fullName: 7000,
    email: 7000,
    phone: 7000,
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    private ngZone: NgZone,
    private recaptcha: RecaptchaService,
    private submission: RecordSubmissionService,
  ) {
    this.contactForm = this.submission.contactForm;
  }

  ngOnInit() {
    if (this.submission.offerForm.invalid || !this.submission.selectedFile) {
      this.router.navigate(['/submit-record/offer']).catch((err) => {
        console.error('Navigation Error', err);
      });
    }
  }

  onBack() {
    this.router.navigate(['/submit-record/offer']).catch((err) => {
      console.error('Navigation Error', err);
    });
  }

  async onSubmit() {
    this.submitError = null;

    if (this.submission.offerForm.invalid || !this.submission.selectedFile) {
      this.submission.offerForm.markAllAsTouched();
      this.router.navigate(['/submit-record/offer']).catch((err) => {
        console.error('Navigation Error', err);
      });
      return;
    }

    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    if (environment.localMockSubmit || this.isLocalEnv) {
      setTimeout(() => {
        this.submission.reset();
        this.ngZone.run(() => {
          this.router.navigate(['/submission-confirmation']);
        });
        this.isSubmitting = false;
      }, 400);
      return;
    }

    try {
      const token = await this.recaptcha.execute('submit');
      const formData = this.submission.buildFormData(token);
      const uploadUrl = environment.apiBaseUrl
        ? `${environment.apiBaseUrl}/upload`
        : '/upload';

      this.http.post(uploadUrl, formData).subscribe({
        next: () => {
          this.submission.reset();
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
    } catch (error) {
      console.error('reCAPTCHA error:', error);
      this.submitError = 'Verification failed. Refresh the page and try again.';
      this.isSubmitting = false;
    }
  }

  onFieldFocus(field: string) {
    const delay = this.hintDelays[field] ?? 7000;
    this.scheduleHint(field, delay);
  }

  onFieldInput(field: string, value: string) {
    if (value.length >= this.minHintLength) {
      this.hideHint(field);
    }
  }

  onFieldBlur(field: string) {
    this.clearHint(field);
  }

  isHintVisible(field: string): boolean {
    return Boolean(this.hintVisible[field]);
  }

  private scheduleHint(field: string, delayMs: number) {
    this.clearHint(field);
    this.hintTimers[field] = setTimeout(() => {
      const value = this.getFieldValue(field);
      if (value.length < this.minHintLength) {
        this.hintVisible[field] = true;
      }
    }, delayMs);
  }

  private hideHint(field: string) {
    this.hintVisible[field] = false;
  }

  private clearHint(field: string) {
    if (this.hintTimers[field]) {
      clearTimeout(this.hintTimers[field] as ReturnType<typeof setTimeout>);
      this.hintTimers[field] = null;
    }
    this.hideHint(field);
  }

  private getFieldValue(field: string): string {
    return String(this.contactForm.get(field)?.value || '');
  }
}
