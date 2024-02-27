import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {}

  suggestRecords() {
    // Здесь будет логика для функции "Suggest Your Records"
    console.log('Suggest Your Records clicked');
    this.router.navigate(['/submit-record']);
  }
}
