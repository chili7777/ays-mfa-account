import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  message: string;
  type: NotificationType;
  id: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications = signal<Notification[]>([]);
  private counter = 0;

  getNotifications() {
    return this.notifications.asReadonly();
  }

  show(message: string, type: NotificationType = 'info', duration = 5000) {
    const id = this.counter++;
    const newNotification: Notification = { message, type, id };

    this.notifications.update(prev => [...prev, newNotification]);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  success(message: string) {
    this.show(message, 'success');
  }

  error(message: string) {
    this.show(message, 'error');
  }

  warning(message: string) {
    this.show(message, 'warning');
  }

  info(message: string) {
    this.show(message, 'info');
  }

  remove(id: number) {
    this.notifications.update(prev => prev.filter(n => n.id !== id));
  }
}
