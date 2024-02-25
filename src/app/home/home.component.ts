import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}

  suggestRecords() {
    // Здесь будет логика для функции "Suggest Your Records"
    console.log('Suggest Your Records clicked');
  }
}
