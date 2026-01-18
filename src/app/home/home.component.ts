import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  constructor(private router: Router) {}

  suggestRecords() {
    console.log('Suggest Your Records clicked');
    this.router
      .navigate(['/submit-record/offer'])
      .catch((err) => console.error('Navigation Error', err));
  }
}
