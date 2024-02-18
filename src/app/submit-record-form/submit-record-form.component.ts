import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Record } from './record.model';

@Component({
  selector: 'app-submit-record-form',
  templateUrl: './submit-record-form.component.html',
  styleUrls: ['./submit-record-form.component.scss'],
})
export class SubmitRecordFormComponent {
  recordForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.recordForm = this.fb.group({
      title: ['', Validators.required],
      artist: ['', Validators.required],
      genre: ['', Validators.required],
      year: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
      condition: ['', Validators.required],
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
    }
  }

  onFileChange(event: any) {
    if (event.target.files && event.target.files.length) {
      const file = event.target.files[0];
      this.recordForm.patchValue({
        image: file,
      });
    }
  }
}
