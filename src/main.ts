import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err));

function loadRecaptchaScript() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src =
      'https://www.google.com/recaptcha/enterprise.js?render=6LcN9aEqAAAAAQAqXjA81RV80ZbJLBcF0FXaIPs';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

loadRecaptchaScript()
  .then(() => {
    console.log('reCAPTCHA script loaded');
    platformBrowserDynamic()
      .bootstrapModule(AppModule)
      .catch((err) => console.error(err));
  })
  .catch((err) => {
    console.error('Failed to load reCAPTCHA script', err);
  });
