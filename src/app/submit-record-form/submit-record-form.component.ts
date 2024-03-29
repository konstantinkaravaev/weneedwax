import { Component, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Record } from './record.model';
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
      year: [
        '',
        [
          Validators.required,
          Validators.minLength(4),
          Validators.pattern(/^\d{4}$/),
        ],
      ],
      condition: ['', [Validators.required, Validators.minLength(2)]],
      price: [
        '',
        [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)],
      ],
      image: [null],
    });
  }

  onSubmit() {
    if (this.recordForm.valid) {
      const record: Record = this.recordForm.value;

      // Логика отправки данных на сервер
      console.log(record);

      // Сброс значений формы и явное установление состояния каждого контрола

      this.http.post('http://localhost:3000/submit', record).subscribe({
        next: (response) => {
          console.log('Data sent successfully', response);
          // Сброс формы после успешной отправки
          // this.recordForm.reset();
        },
        error: (error) => console.error('Error sending data', error),
      });

      this.recordForm.reset();
      Object.keys(this.recordForm.controls).forEach((key) => {
        const control = this.recordForm.get(key);
        control?.markAsPristine();
        control?.markAsUntouched();
      });

      // Если нужно очистить элемент ввода файла
      if (this.fileInput) {
        this.fileInput.nativeElement.value = '';
      }

      this.ngZone.run(() => {
        this.router.navigate(['/submission-confirmation']);
      });
    }
  }

  // resetForm() {
  //   // Сброс значений формы и явное установление состояния каждого контрола
  //   this.recordForm.reset();
  //   Object.keys(this.recordForm.controls).forEach((key) => {
  //     const control = this.recordForm.get(key);
  //     control?.markAsPristine();
  //     control?.markAsUntouched();
  //   });

  // Если нужно очистить элемент ввода файла
  // if (this.fileInput) {
  //   this.fileInput.nativeElement.value = '';
  // }

  onFileChange(event: any) {
    if (event.target.files && event.target.files.length) {
      const file = event.target.files[0];

      // Проверяем, что файл является изображением JPEG или PNG
      if (file.type === 'image/jpeg' || file.type === 'image/png') {
        const formData = new FormData();
        formData.append('file', file);

        // Отправляем файл на сервер
        this.http
          .post('http://localhost:3000/upload', formData, {
            responseType: 'text',
          })
          .subscribe({
            next: (response) =>
              console.log('File uploaded successfully', response),
            error: (error) => console.error('Error uploading file', error),
          });
      } else {
        console.error('File is not a JPEG or PNG image :)');
      }
    }
  }
}
