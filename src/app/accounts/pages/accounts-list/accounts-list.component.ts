import { Component, OnInit, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AccountService } from '../../services/account.service';
import { MovementService } from '../../services/movement.service';
import { CustomerService } from '../../services/customer.service';
import { Account } from '../../interfaces/account.interface';
import { Customer } from '../../interfaces/customer.interface';
import { MfeBridgeService } from '../../../core/services/mfe-bridge.service';

@Component({
  selector: 'app-accounts-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './accounts-list.component.html',
  styleUrl: './accounts-list.component.scss'
})
export class AccountsListComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly accountService = inject(AccountService);
  private readonly movementService = inject(MovementService);
  private readonly customerService = inject(CustomerService);
  private readonly mfeBridge = inject(MfeBridgeService);

  accounts = signal<Account[]>([]);
  customers = signal<Customer[]>([]);
  searchTerm = signal<string>('');
  loading = signal<boolean>(false);
  showDeleteModal = signal<boolean>(false);
  deleteId = signal<string>('');
  isBalancesVisible = signal<boolean>(false);

  // Filtro de clientes (ADMIN)
  selectedClientIdFilter = signal<string>('');
  customerSearchTerm = signal<string>('');
  showCustomerDropdown = signal<boolean>(false);
  statusFilter = signal<'all' | 'active' | 'inactive'>('all');

  // Sincronización vía Bridge
  userRole = computed(() => this.mfeBridge.sessionData().role?.toUpperCase() || null);
  currentClientId = computed(() => this.mfeBridge.sessionData().clientId);

  private initialLoadDone = false;
  private readonly refreshHandler = () => this.loadAccounts();

  constructor() {
    effect(() => {
      // Recargar datos cuando cambie el rol o el clientId sincronizado
      if (this.userRole() && !this.initialLoadDone) {
        this.initialLoadDone = true;
        if (this.isAdmin()) {
          this.loadCustomers();
        }
        this.loadAccounts();
      }
    });
  }

  isAdmin = computed(() => {
    const role = this.userRole();
    return role ? role.includes('ADMIN') || role.includes('GESTOR') || role.includes('ROOT') : false;
  });

  dropdownCustomers = computed(() => {
    const term = this.customerSearchTerm().toLowerCase().trim();
    if (!term) return this.customers();
    return this.customers().filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.identification.toLowerCase().includes(term)
    );
  });

  selectedCustomerName = computed(() => {
    const id = this.selectedClientIdFilter();
    if (!id) return 'Todos los Clientes';
    const customer = this.customers().find(c => c.id === id);
    return customer ? customer.name : 'Cliente Desconocido';
  });

  filteredAccounts = computed(() => {
    let list = this.accounts();

    // Filtro por rol y clientId: El USER solo ve sus cuentas
    // El ADMIN ve todo, pero si viene un clientId externo (vía queryParam),
    // loadAccounts ya se encargó de traer solo esas o todas.
    if (!this.isAdmin() && this.currentClientId()) {
      list = list.filter(a => a.clientId === this.currentClientId());
    }

    // Filtro ADICIONAL por cliente seleccionado en el dropdown (ADMIN)
    if (this.isAdmin() && this.selectedClientIdFilter()) {
      list = list.filter(a => a.clientId === this.selectedClientIdFilter());
    }

    // Filtro por estado (ADMIN)
    if (this.isAdmin() && this.statusFilter() !== 'all') {
      const isActive = this.statusFilter() === 'active';
      list = list.filter(a => a.status === isActive);
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
    window.addEventListener('refresh-balances', this.refreshHandler);
    // Verificamos parámetros de URL para compatibilidad con navegación manual
    this.route.queryParams.subscribe(params => {
      const clientId = params['client'] || params['clientId'] || params['uuid'];

      if (clientId) {
        this.selectedClientIdFilter.set(clientId);
      }
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('refresh-balances', this.refreshHandler);
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
    if (!this.userRole()) return;
    this.loading.set(true);

    // Lógica de carga basada en rol
    // Si es ADMIN, cargamos todas las cuentas por defecto
    // Si es USER, cargamos por su clientId
    const isAdmin = this.isAdmin();
    const clientId = this.currentClientId();

    const obs$ = (isAdmin)
      ? this.accountService.getAllAccounts()
      : (clientId ? this.accountService.getAccountsByClientId(clientId) : this.accountService.getAllAccounts());

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

  toggleCustomerDropdown(): void {
    if (!this.isAdmin()) return;
    this.showCustomerDropdown.update(v => !v);
    if (this.showCustomerDropdown()) {
      this.customerSearchTerm.set('');
    }
  }

  selectCustomerFilter(customer: Customer): void {
    this.selectedClientIdFilter.set(customer.id || '');
    this.showCustomerDropdown.set(false);
  }

  clearCustomerFilter(): void {
    this.selectedClientIdFilter.set('');
    this.showCustomerDropdown.set(false);
  }

  clearAllFilters(): void {
    this.selectedClientIdFilter.set('');
    this.statusFilter.set('all');
    this.showCustomerDropdown.set(false);
  }

  goToCreate(): void {
    const queryParams: any = {};
    const clientId = this.isAdmin() ? this.selectedClientIdFilter() : this.currentClientId();
    if (clientId) {
      queryParams.client = clientId;
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
      const clientId = this.isAdmin() ? this.selectedClientIdFilter() : this.currentClientId();
      if (clientId) {
        queryParams.client = clientId;
      }
      this.router.navigate(['/accounts/detail', id], { queryParams });
    }
  }

  goToMovements(id: string | undefined): void {
    if (id) {
      // Para navegación entre Microfrontends, usamos el Bridge hacia la Shell
      this.mfeBridge.navigateTo('/movements', { account: id });
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
