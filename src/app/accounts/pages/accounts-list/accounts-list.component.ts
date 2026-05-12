import { Component, OnInit, inject, signal, computed } from '@angular/core';
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

  accounts = signal<Account[]>([]);
  customers = signal<Customer[]>([]);
  searchTerm = signal<string>('');
  loading = signal<boolean>(false);
  showDeleteModal = signal<boolean>(false);
  deleteId = signal<string>('');

  filteredAccounts = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.accounts();

    return this.accounts().filter(a =>
      (a.accountNumber?.toLowerCase().includes(term)) ||
      (a.accountType?.toLowerCase().includes(term)) ||
      (this.getCustomerName(a.clientId).toLowerCase().includes(term))
    );
  });

  ngOnInit(): void {
    this.loadCustomers();
    this.loadAccounts();
  }

  loadCustomers(): void {
    this.customerService.getCustomers().subscribe({
      next: (data) => this.customers.set(data),
      error: (err) => console.error('Error al cargar clientes', err)
    });
  }

  getCustomerName(id: string): string {
    const customer = this.customers().find(c => c.id === id);
    return customer ? customer.name : id;
  }

  loadAccounts(): void {
    this.loading.set(true);
    this.accountService.getAllAccounts().subscribe({
      next: (data) => {
        this.accounts.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar cuentas', err);
        this.loading.set(false);
      }
    });
  }

  onSearch(): void {
    // La búsqueda es reactiva a través del computed filteredAccounts
  }

  toggleStatus(account: Account): void {
    if (!account.id) return;

    const newStatus = !account.status;
    this.accountService.patchAccount({ status: newStatus }, account.id).subscribe({
      next: () => {
        this.accounts.update(prev =>
          prev.map(a => a.id === account.id ? { ...a, status: newStatus } : a)
        );
      },
      error: (err) => {
        console.error('Error al cambiar estado', err);
        alert('No se pudo actualizar el estado de la cuenta');
      }
    });
  }

  goToCreate(): void {
    this.router.navigate(['/accounts/create']);
  }

  goToEdit(id: string | undefined): void {
    if (id) {
      this.router.navigate(['/accounts/edit', id]);
    }
  }

  goToDetail(id: string | undefined): void {
    if (id) {
      this.router.navigate(['/accounts/detail', id]);
    }
  }

  confirmDelete(id: string | undefined): void {
    if (id) {
      this.deleteId.set(id);
      this.showDeleteModal.set(true);
    }
  }

  onDelete(): void {
    const id = this.deleteId();
    if (id) {
      this.movementService.getAllMovements({ accountId: id }).subscribe({
        next: (movements) => {
          if (movements && movements.length > 0) {
            alert('No se puede eliminar la cuenta porque tiene movimientos asociados.');
            this.showDeleteModal.set(false);
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
    this.accountService.deleteAccount(this.deleteId()).subscribe({
      next: () => {
        this.accounts.update(prev => prev.filter(a => a.id !== this.deleteId()));
        this.showDeleteModal.set(false);
        alert('Cuenta eliminada con éxito');
      },
      error: (err) => {
        console.error('Error al eliminar', err);
        alert('No se pudo eliminar la cuenta. ' + (err.error?.message || ''));
        this.showDeleteModal.set(false);
      }
    });
  }
}
