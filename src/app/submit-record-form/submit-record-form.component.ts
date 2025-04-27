import { Component, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NgZone } from '@angular/core';

@Component({
  selector: 'app-submit-record-form',
  templateUrl: './submit-record-form.component.html',
  styleUrls: ['./submit-record-form.component.scss'],
})
export class SubmitRecordFormComponent {
  @ViewChild('fileInput') fileInput!: ElementRef;
  recordForm: FormGroup;
  selectedFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private ngZone: NgZone
  ) {
    this.recordForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2)]],
      artist: ['', [Validators.required, Validators.minLength(2)]],
      genre: ['', [Validators.required, Validators.minLength(2)]],
      year: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
      condition: ['', [Validators.required, Validators.minLength(2)]],
      price: [
        '',
        [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)],
      ],
    });
  }

  onSubmit() {
    if (this.recordForm.valid) {
      const formData = new FormData();
      formData.append('title', this.recordForm.value.title);
      formData.append('artist', this.recordForm.value.artist);
      formData.append('genre', this.recordForm.value.genre);
      formData.append('year', this.recordForm.value.year);
      formData.append('condition', this.recordForm.value.condition);
      formData.append('price', this.recordForm.value.price);

      if (this.selectedFile) {
        formData.append('file', this.selectedFile);
      }

      console.log('Form Data Ready to Send:', formData);

      this.http.post('https://weneedwax.com/upload', formData).subscribe({
        next: (response) => {
          console.log('Data sent successfully:', response);
          this.resetForm();
          this.ngZone.run(() => {
            this.router.navigate(['/submission-confirmation']);
          });
        },
        error: (error) => {
          console.error('Error sending data:', error);
        },
      });
    } else {
      console.log('Form is invalid');
    }
  }
  resetForm() {
    this.recordForm.reset();

    this.recordForm.markAsPristine();
    this.recordForm.markAsUntouched();
    this.recordForm.updateValueAndValidity();

    this.selectedFile = null;

    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onFileChange(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      if (file.type === 'image/jpeg' || file.type === 'image/png') {
        this.selectedFile = file;
      } else {
        console.error('File must be JPEG or PNG format');
        this.selectedFile = null;
      }
    }
  }
}
