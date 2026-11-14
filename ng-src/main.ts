import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

function dismissBootLoader(): void {
  const el = document.getElementById('boot-loader');
  const style = document.getElementById('boot-loader-style');
  if (el) {
    el.classList.add('boot-hide');
    setTimeout(() => {
      el.remove();
      style?.remove();
    }, 240);
  } else {
    style?.remove();
  }
}

bootstrapApplication(AppComponent, appConfig)
  .then(() => dismissBootLoader())
  .catch(err => {
    dismissBootLoader();
    console.error(err);
  });
