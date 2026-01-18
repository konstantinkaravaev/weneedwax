import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';

import { RecordSubmissionService } from '../services/record-submission.service';

@Component({
  selector: 'app-submit-record-offer',
  templateUrl: './submit-record-offer.component.html',
  styleUrls: ['./submit-record-offer.component.scss'],
})
export class SubmitRecordOfferComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  offerForm!: FormGroup;
  isProcessingFile = false;
  fileError: string | null = null;

  private hintTimers: Record<string, ReturnType<typeof setTimeout> | null> = {};
  private hintVisible: Record<string, boolean> = {};
  private readonly minHintLength = 3;
  private readonly hintDelays: Record<string, number> = {
    title: 5000,
    artist: 5000,
    genre: 5000,
    condition: 5000,
    year: 5000,
    price: 5000,
    file: 5000,
  };

  constructor(
    private submission: RecordSubmissionService,
    private router: Router,
  ) {
    this.offerForm = this.submission.offerForm;
  }

  get selectedFile(): File | null {
    return this.submission.selectedFile;
  }

  get genreOptions(): readonly string[] {
    return this.submission.genreOptions;
  }

  async onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.fileError = null;

    if (input?.files && input.files.length > 0) {
      let file = input.files[0];
      this.isProcessingFile = true;

      try {
        file = await this.submission.processFile(file);
        this.submission.setSelectedFile(file);
        this.hideHint('file');
      } catch (err) {
        console.error('File processing error:', err);
        this.fileError = 'Unable to process the file. Please try another image.';
        this.offerForm.get('file')?.setErrors({ processing: true });
        this.submission.setSelectedFile(null);
      } finally {
        this.isProcessingFile = false;
      }
    } else {
      this.submission.setSelectedFile(null);
    }
  }

  onNext() {
    if (!this.offerForm.valid || !this.selectedFile) {
      this.offerForm.markAllAsTouched();
      this.offerForm.get('file')?.setErrors({ required: true });
      return;
    }

    this.router.navigate(['/submit-record/contact']).catch((err) => {
      console.error('Navigation Error', err);
    });
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
    if (this.shouldShowHint(field)) {
      this.hintVisible[field] = true;
    }
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
    if (field === 'file') {
      return this.selectedFile ? 'file' : '';
    }
    return String(this.offerForm.get(field)?.value || '');
  }

  private shouldShowHint(field: string): boolean {
    const value = this.getFieldValue(field);
    return value.length < this.minHintLength;
  }
}
