import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { SubmitRecordFormComponent } from './submit-record-form/submit-record-form.component';
import { SubmissionConfirmationComponent } from './submission-confirmation/submission-confirmation.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'submit-record', component: SubmitRecordFormComponent },
  {
    path: 'submission-confirmation',
    component: SubmissionConfirmationComponent,
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
