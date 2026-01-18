import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class RecordSubmissionService {
  readonly offerForm: FormGroup;
  readonly contactForm: FormGroup;
  selectedFile: File | null = null;

  constructor(private fb: FormBuilder) {
    this.offerForm = this.fb.group({
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

    this.contactForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [
        '',
        [Validators.required, Validators.pattern(/^\+?[0-9\s().-]{7,}$/)],
      ],
    });
  }

  async processFile(file: File): Promise<File> {
    const imageCompression = (await import('browser-image-compression')).default;
    const heic2any = (await import('heic2any')).default;

    if (
      file.type === 'image/heic' ||
      file.name.toLowerCase().endsWith('.heic')
    ) {
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
      });
      file = new File([convertedBlob as Blob], file.name.replace(/\.heic$/, '.jpg'), {
        type: 'image/jpeg',
      });
    }

    return imageCompression(file, {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    });
  }

  setSelectedFile(file: File | null) {
    this.selectedFile = file;
    this.offerForm.get('file')?.setValue(file);
  }

  buildFormData(recaptchaToken: string): FormData {
    const formData = new FormData();
    const offer = this.offerForm.value;
    const contact = this.contactForm.value;

    formData.append('fullName', contact.fullName);
    formData.append('email', contact.email);
    formData.append('phone', contact.phone);
    formData.append('title', offer.title);
    formData.append('artist', offer.artist);
    formData.append('genre', offer.genre);
    formData.append('year', offer.year);
    formData.append('condition', offer.condition);
    formData.append('price', offer.price);
    if (this.selectedFile) {
      formData.append('file', this.selectedFile);
    }
    formData.append('recaptchaToken', recaptchaToken);

    return formData;
  }

  reset() {
    this.offerForm.reset();
    this.contactForm.reset();
    this.offerForm.markAsPristine();
    this.offerForm.markAsUntouched();
    this.offerForm.updateValueAndValidity();
    this.contactForm.markAsPristine();
    this.contactForm.markAsUntouched();
    this.contactForm.updateValueAndValidity();
    this.selectedFile = null;
  }
}
