import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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
  private readonly route = inject(ActivatedRoute);
  private readonly accountService = inject(AccountService);
  private readonly movementService = inject(MovementService);
  private readonly customerService = inject(CustomerService);

  accounts = signal<Account[]>([]);
  customers = signal<Customer[]>([]);
  searchTerm = signal<string>('');
  loading = signal<boolean>(false);
  showDeleteModal = signal<boolean>(false);
  deleteId = signal<string>('');
  isBalancesVisible = signal<boolean>(false);
  userRole = signal<string>((localStorage.getItem('userRole') || 'USER').trim().toUpperCase());
  currentClientId = signal<string | null>(localStorage.getItem('clientId'));

  isAdmin = computed(() => this.userRole() === 'ADMIN');

  filteredAccounts = computed(() => {
    let list = this.accounts();

    // Filtro por rol y clientId
    if (!this.isAdmin() && this.currentClientId()) {
      list = list.filter(a => a.clientId === this.currentClientId());
    }

    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return list;

    return list.filter(a =>
      (a.accountNumber?.toLowerCase().includes(term)) ||
      (a.accountType?.toLowerCase().includes(term)) ||
      (this.getCustomerName(a.clientId).toLowerCase().includes(term))
    );
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const cid = params['clientId'] || params['client'];
      if (cid) {
        this.currentClientId.set(cid);
      } else {
        // Si no viene por query param, intentar de localStorage
        this.currentClientId.set(localStorage.getItem('clientId'));
      }

      // Cargar cuentas después de tener el clientId
      this.loadAccounts();
    });

    this.loadCustomers();
  }

  loadCustomers(): void {
    this.customerService.getCustomers().subscribe({
      next: (data) => this.customers.set(data),
      error: (err) => console.error('Error al cargar clientes', err)
    });
  }

  getCustomerName(id: string): string {
    const customer = this.customers().find(c => c.id === id);
    return customer ? customer.name : '';
  }

  maskAccountNumber(num: string | undefined): string {
    if (!num) return '';
    const last3 = num.slice(-3);
    return `****${last3}`;
  }

  getAccountTypeLabel(type: string | undefined): string {
    if (type === 'SAVINGS') return 'Cuenta Ahorros';
    if (type === 'CURRENT') return 'Cuenta Transaccional';
    return 'Cuenta';
  }

  loadAccounts(): void {
    this.loading.set(true);
    const clientId = this.currentClientId();

    const obs$ = (clientId)
      ? this.accountService.getAccountsByClientId(clientId)
      : this.accountService.getAllAccounts();

    obs$.subscribe({
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

  onStatusClick(event: MouseEvent, account: Account): void {
    event.stopPropagation();
    if (this.isAdmin()) {
      this.toggleStatus(account);
    }
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

  toggleBalancesVisibility(): void {
    this.isBalancesVisible.update(v => !v);
  }

  goToCreate(): void {
    const queryParams: any = {};
    if (this.currentClientId()) {
      queryParams.client = this.currentClientId();
    }
    this.router.navigate(['/accounts/create'], { queryParams });
  }

  goToEdit(id: string | undefined): void {
    if (id) {
      this.router.navigate(['/accounts/edit', id]);
    }
  }

  goToDetail(id: string | undefined): void {
    if (id) {
      const queryParams: any = {};
      if (this.currentClientId()) {
        queryParams.client = this.currentClientId();
      }
      this.router.navigate(['/accounts/detail', id], { queryParams });
    }
  }

  goToClients(): void {
    this.router.navigate(['/clients']);
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
