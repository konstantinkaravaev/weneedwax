import { Injectable } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js';

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
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

const CONDITION_OPTIONS = [
  'Mint (M)',
  'Near Mint (NM)',
  'Very Good Plus (VG+)',
  'Very Good (VG)',
  'Good Plus (G+)',
  'Good (G)',
  'Fair (F)',
  'Poor (P)'
] as const;

@Injectable({ providedIn: 'root' })
export class RecordSubmissionService {
  readonly offerForm: FormGroup;
  readonly contactForm: FormGroup;
  selectedFile: File | null = null;
  readonly genreOptions = GENRE_OPTIONS;
  readonly conditionOptions = CONDITION_OPTIONS;

  constructor(private fb: FormBuilder) {
    this.offerForm = this.fb.group({
      title: ['', [Validators.required, trimmedMinLength(2)]],
      artist: ['', [Validators.required, trimmedMinLength(2)]],
      genre: ['', [Validators.required, genreValidator()]],
      year: ['', [Validators.required, yearValidator()]],
      condition: ['', [Validators.required, conditionValidator()]],
      price: [
        '',
        [Validators.required, Validators.pattern(PRICE_REGEX), priceValidator()],
      ],
      file: [null, Validators.required],
    });

    this.contactForm = this.fb.group({
      fullName: ['', [Validators.required, trimmedMinLength(2)]],
      email: [
        '',
        [Validators.required, Validators.pattern(EMAIL_REGEX), asciiEmailValidator()],
      ],
      phone: [
        '',
        [Validators.required],
      ],
    });
  }

  async processFile(file: File): Promise<File> {
    return file;
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
    const phoneValue = normalizePhoneInput(contact.phone);
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

function asciiEmailValidator() {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value || '');
    if (!value) {
      return null;
    }
    if (!/^[\x00-\x7F]+$/.test(value)) {
      return { emailAscii: true };
    }
    return null;
  };
}

function conditionValidator() {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value || '').trim();
    if (!value || !CONDITION_OPTIONS.includes(value as (typeof CONDITION_OPTIONS)[number])) {
      return { conditionInvalid: true };
    }
    return null;
  };
}

function normalizePhoneInput(value: unknown): string {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'object') {
    const candidate = value as {
      internationalNumber?: string;
      number?: string;
      nationalNumber?: string;
      e164Number?: string;
    };
    const preferred =
      candidate.internationalNumber ||
      candidate.number ||
      candidate.e164Number ||
      candidate.nationalNumber ||
      '';
    return String(preferred).trim();
  }
  return String(value).trim();
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
