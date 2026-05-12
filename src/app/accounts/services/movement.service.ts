import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MovementService {
  private readonly http = inject(HttpClient);
  // Asumiendo que sigue el patrón del microservicio de cuentas
  private readonly apiUrl = 'https://ays-msa-dm-cuaa-cr-account-stagi-zdpms.ondigitalocean.app/movements';

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'X-Guid': '00000000-0000-0000-0000-000000000000',
      'X-App': 'terminal-curl',
      'Accept': 'application/json'
    });
  }

  getAllMovements(params?: { accountId?: string, fromDate?: string, toDate?: string }): Observable<any[]> {
    let url = this.apiUrl;
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.accountId) queryParams.append('accountId', params.accountId);
      if (params.fromDate) queryParams.append('fromDate', params.fromDate);
      if (params.toDate) queryParams.append('toDate', params.toDate);
      const query = queryParams.toString();
      if (query) url += `?${query}`;
    }

    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        if (Array.isArray(response)) return response;
        if (response && response.data && Array.isArray(response.data)) return response.data;
        return [];
      })
    );
  }

  getMovementById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() }).pipe(
      map(response => response.data || response.movement || response)
    );
  }

  createMovement(movement: any): Observable<any> {
    return this.http.post(this.apiUrl, movement, { headers: this.getHeaders() });
  }

  deleteMovement(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
