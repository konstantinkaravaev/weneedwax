import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-submission-confirmation',
  templateUrl: './submission-confirmation.component.html',
  styleUrls: ['./submission-confirmation.component.scss'],
})
export class SubmissionConfirmationComponent {
  constructor(private router: Router) {}

  goToHome() {
    this.router.navigate(['/']);
  }
}
