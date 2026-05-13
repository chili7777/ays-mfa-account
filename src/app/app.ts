import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationComponent } from './core/components/notification/notification.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('ays-mfa-account');
}
