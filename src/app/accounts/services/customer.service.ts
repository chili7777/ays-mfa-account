import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Customer } from '../interfaces/customer.interface';

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://ays-mfa-customer-gokba.ondigitalocean.app/customers';

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'X-Guid': '00000000-0000-0000-0000-000000000000',
      'X-App': 'terminal-curl',
      'Accept': 'application/json'
    });
  }

  getCustomers(): Observable<Customer[]> {
    return this.http.get<any>(this.apiUrl, { headers: this.getHeaders() }).pipe(
      map(response => {
        if (Array.isArray(response)) return response;
        if (response && response.data && Array.isArray(response.data)) return response.data;
        if (response && response.customers && Array.isArray(response.customers)) return response.customers;
        return [];
      })
    );
  }

  getCustomerById(id: string): Observable<Customer> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() }).pipe(
      map(response => response.data || response.customer || response)
    );
  }

  createCustomer(customer: Partial<Customer>): Observable<any> {
    return this.http.post(this.apiUrl, customer, { headers: this.getHeaders() });
  }

  updateCustomer(customer: Partial<Customer>, id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, customer, { headers: this.getHeaders() });
  }

  deleteCustomer(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
