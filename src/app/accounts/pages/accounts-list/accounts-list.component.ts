import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountService } from '../../services/account.service';
import { MovementService } from '../../services/movement.service';
import { CustomerService } from '../../services/customer.service';
import { Account } from '../../interfaces/account.interface';
import { Customer } from '../../interfaces/customer.interface';

@Component({
  selector: 'app-accounts-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './accounts-list.component.html',
  styleUrl: './accounts-list.component.scss'
})
export class AccountsListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly accountService = inject(AccountService);
  private readonly movementService = inject(MovementService);
  private readonly customerService = inject(CustomerService);

  accounts: Account[] = [];
  customers: Customer[] = [];
  filteredAccounts: Account[] = [];
  searchTerm: string = '';
  showDeleteModal: boolean = false;
  deleteId: string = '';

  ngOnInit(): void {
    this.loadCustomers();
    this.loadAccounts();
  }

  loadCustomers(): void {
    this.customerService.getCustomers().subscribe({
      next: (data) => this.customers = data,
      error: (err) => console.error('Error al cargar clientes', err)
    });
  }

  getCustomerName(id: string): string {
    const customer = this.customers.find(c => c.id === id);
    return customer ? customer.name : id;
  }

  loadAccounts(): void {
    this.accountService.getAllAccounts().subscribe({
      next: (data) => {
        this.accounts = data;
        this.filteredAccounts = data;
      },
      error: (err) => console.error('Error al cargar cuentas', err)
    });
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredAccounts = this.accounts;
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredAccounts = this.accounts.filter(a =>
      (a.id?.toLowerCase().includes(term)) ||
      (a.accountNumber.toLowerCase().includes(term)) ||
      (a.clientId.toLowerCase().includes(term))
    );
  }

  goToCreate(): void {
    this.router.navigate(['/accounts/create']);
  }

  goToDetail(id: string | undefined): void {
    if (id) {
      this.router.navigate(['/accounts/detail', id]);
    }
  }

  confirmDelete(id: string | undefined): void {
    if (id) {
      this.deleteId = id;
      this.showDeleteModal = true;
    }
  }

  onDelete(): void {
    if (this.deleteId) {
      // Validación bancaria
      this.movementService.getAllMovements({ accountId: this.deleteId }).subscribe({
        next: (movements) => {
          if (movements && movements.length > 0) {
            alert('No se puede eliminar la cuenta porque tiene movimientos asociados.');
            this.showDeleteModal = false;
            return;
          }
          this.executeDelete();
        },
        error: () => {
          this.executeDelete();
        }
      });
    }
  }

  private executeDelete(): void {
    this.accountService.deleteAccount(this.deleteId).subscribe({
      next: () => {
        this.accounts = this.accounts.filter(a => a.id !== this.deleteId);
        this.onSearch();
        this.showDeleteModal = false;
        alert('Cuenta eliminada con éxito');
      },
      error: (err) => {
        console.error('Error al eliminar', err);
        alert('No se pudo eliminar la cuenta. ' + (err.error?.message || ''));
        this.showDeleteModal = false;
      }
    });
  }
}
