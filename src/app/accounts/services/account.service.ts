import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Account, ApiResponse } from '../interfaces/account.interface';

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private readonly http = inject(HttpClient);

  // URL base unificada para Cloud y Local (se prefiere Cloud para que funcione en el despliegue)
  private readonly apiUrl = 'https://ays-msa-dm-cuaa-cr-account-stagi-zdpms.ondigitalocean.app/accounts';

  private getHeaders(isJson = false): HttpHeaders {
    const headers: any = {
      'X-Guid': '00000000-0000-0000-0000-000000000000',
      'X-App': 'terminal-curl',
      'Accept': 'application/json'
    };

    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }

    return new HttpHeaders(headers);
  }

  getAllAccounts(): Observable<Account[]> {
    console.log('Llamando a getAllAccounts en:', this.apiUrl);
    return this.http.get<any>(this.apiUrl, { headers: this.getHeaders() }).pipe(
      map(response => {
        console.log('Respuesta de getAllAccounts:', response);
        let data = [];
        if (Array.isArray(response)) {
          data = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          data = response.data;
        } else if (response && response.accounts && Array.isArray(response.accounts)) {
          data = response.accounts;
        }

        return data.map((acc: any) => ({
          ...acc,
          id: acc.id || acc.accountId // Normalizar ID por si la API usa accountId
        }));
      })
    );
  }

  getAccountById(accountId: string): Observable<Account> {
    const url = `${this.apiUrl}/${accountId}`;
    console.log('Llamando a getAccountById en:', url);
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(response => {
        console.log(`Respuesta de getAccountById(${accountId}):`, response);
        // Manejar respuesta directa o envuelta en data
        const data = response && (response.data || response.account || response);

        if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
          console.warn('No se encontraron datos en la respuesta');
          throw new Error('No se encontraron datos para la cuenta');
        }

        // Si es un array (poco común para getById), tomar el primero
        const item = Array.isArray(data) ? data[0] : data;

        return {
          ...item,
          id: item.id || item.accountId || accountId
        };
      })
    );
  }

  createAccount(account: Account): Observable<any> {
    return this.http.post(this.apiUrl, account, { headers: this.getHeaders(true) });
  }

  updateAccount(account: Partial<Account>, accountId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${accountId}`, account, { headers: this.getHeaders(true) });
  }

  patchAccount(account: Partial<Account>, accountId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${accountId}`, account, { headers: this.getHeaders(true) });
  }

  deleteAccount(accountId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${accountId}`, { headers: this.getHeaders() });
  }
}
