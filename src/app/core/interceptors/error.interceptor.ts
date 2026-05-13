import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { MfeBridgeService } from '../services/mfe-bridge.service';
import { ErrorModelDto } from '../interfaces/error.interface';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);
  const mfeBridgeService = inject(MfeBridgeService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const errorData: ErrorModelDto = error.error;

      // Si no es un objeto ErrorModelDto, intentar construir uno básico
      const detail = errorData?.detail || error.message || 'Error desconocido';

      switch (error.status) {
        case 400:
          // Errores de negocio y validación
          notificationService.error(detail);
          break;
        case 401:
          // Redirigir al login e invalidar sesión
          notificationService.warning('Sesión expirada o no autorizada');
          mfeBridgeService.logout();
          break;
        case 404:
          // Not Found (clientes/cuentas)
          notificationService.warning(errorData?.detail || 'El registro solicitado no existe');
          break;
        case 500:
          // Internal Server Error
          notificationService.error('Hubo un problema en el servidor. Nuestro equipo técnico ha sido notificado.');
          break;
        default:
          notificationService.error(detail);
          break;
      }

      // Devolvemos el error para que el componente pueda manejar errores de validación específicos si existen
      return throwError(() => error);
    })
  );
};
