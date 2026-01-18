import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { SubmissionConfirmationComponent } from './submission-confirmation/submission-confirmation.component';
import { SubmitRecordOfferComponent } from './submit-record-offer/submit-record-offer.component';
import { SubmitRecordContactComponent } from './submit-record-contact/submit-record-contact.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    SubmissionConfirmationComponent,
    SubmitRecordOfferComponent,
    SubmitRecordContactComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    HttpClientModule,
    RouterModule.forRoot([
      { path: '', component: HomeComponent },
      { path: 'submit-record', redirectTo: 'submit-record/offer', pathMatch: 'full' },
      { path: 'submit-record/offer', component: SubmitRecordOfferComponent },
      { path: 'submit-record/contact', component: SubmitRecordContactComponent },
      {
        path: 'submission-confirmation',
        component: SubmissionConfirmationComponent,
      },
    ]),
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
