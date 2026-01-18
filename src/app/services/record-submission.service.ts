import { Injectable } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PRICE_REGEX = /^\d+(\.\d{1,2})?$/;
const MIN_YEAR = 1900;
const MAX_PRICE = 100000;

const GENRE_OPTIONS = [
  'Ambient',
  'Blues',
  'Classical',
  'Disco',
  'Electronic',
  'Funk',
  'House',
  'Hip-Hop',
  'Jazz',
  'Pop',
  'R&B',
  'Reggae',
  'Rock',
  'Soul',
  'Techno'
] as const;

@Injectable({ providedIn: 'root' })
export class RecordSubmissionService {
  readonly offerForm: FormGroup;
  readonly contactForm: FormGroup;
  selectedFile: File | null = null;
  readonly genreOptions = GENRE_OPTIONS;

  constructor(private fb: FormBuilder) {
    this.offerForm = this.fb.group({
      title: ['', [Validators.required, trimmedMinLength(2)]],
      artist: ['', [Validators.required, trimmedMinLength(2)]],
      genre: ['', [Validators.required, genreValidator()]],
      year: ['', [Validators.required, yearValidator()]],
      condition: ['', [Validators.required, trimmedMinLength(2)]],
      price: [
        '',
        [Validators.required, Validators.pattern(PRICE_REGEX), priceValidator()],
      ],
      file: [null, Validators.required],
    });

    this.contactForm = this.fb.group({
      fullName: ['', [Validators.required, trimmedMinLength(2)]],
      email: ['', [Validators.required, Validators.pattern(EMAIL_REGEX)]],
      phone: [
        '',
        [Validators.required],
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
      useWebWorker: false,
    });
  }

  setSelectedFile(file: File | null) {
    this.selectedFile = file;
    this.offerForm.get('file')?.setValue(file);
  }

  buildFormData(recaptchaToken: string, phoneCountryIso?: string | null): FormData {
    const formData = new FormData();
    const offer = this.offerForm.value;
    const contact = this.contactForm.value;

    formData.append('fullName', String(contact.fullName || '').trim());
    formData.append('email', String(contact.email || '').trim());
    const phoneValue = String(contact.phone || '').trim();
    const formattedPhone = formatPhoneNumber(phoneValue, phoneCountryIso);
    formData.append('phone', formattedPhone);
    formData.append('title', String(offer.title || '').trim());
    formData.append('artist', String(offer.artist || '').trim());
    formData.append('genre', String(offer.genre || '').trim());
    formData.append('year', String(offer.year || '').trim());
    formData.append('condition', String(offer.condition || '').trim());
    formData.append('price', String(offer.price || '').trim());
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

function trimmedMinLength(minLength: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value || '').trim();
    if (value.length < minLength) {
      return { trimmedMinLength: { requiredLength: minLength } };
    }
    return null;
  };
}

function yearValidator() {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = String(control.value || '').trim();
    if (!/^\d{4}$/.test(raw)) {
      return { yearRange: true };
    }
    const year = Number(raw);
    const maxYear = new Date().getFullYear();
    if (year < MIN_YEAR || year > maxYear) {
      return { yearRange: true };
    }
    return null;
  };
}

function priceValidator() {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = String(control.value || '').trim();
    if (!PRICE_REGEX.test(raw)) {
      return null;
    }
    const price = Number(raw);
    if (!Number.isFinite(price) || price <= 0 || price > MAX_PRICE) {
      return { priceRange: true };
    }
    return null;
  };
}


function genreValidator() {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value || '').trim();
    if (!value || !GENRE_OPTIONS.includes(value as (typeof GENRE_OPTIONS)[number])) {
      return { genreInvalid: true };
    }
    return null;
  };
}

function formatPhoneNumber(value: string, countryIso?: string | null): string {
  if (!value) {
    return '';
  }
  try {
    const parsed = parsePhoneNumberFromString(
      value,
      countryIso ? (countryIso.toUpperCase() as CountryCode) : undefined
    );
    if (parsed?.number) {
      return parsed.number;
    }
  } catch (error) {
    return value;
  }
  return value;
}
