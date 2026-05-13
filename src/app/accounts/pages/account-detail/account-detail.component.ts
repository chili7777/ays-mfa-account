import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountService } from '../../services/account.service';
import { MovementService } from '../../services/movement.service';
import { CustomerService } from '../../services/customer.service';
import { Account } from '../../interfaces/account.interface';
import { Customer } from '../../interfaces/customer.interface';

@Component({
  selector: 'app-account-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './account-detail.component.html',
  styleUrl: './account-detail.component.scss'
})
export class AccountDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly accountService = inject(AccountService);
  private readonly movementService = inject(MovementService);
  private readonly customerService = inject(CustomerService);

  account = signal<Account | null>(null);
  customer = signal<Customer | null>(null);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  showDeleteModal = signal(false);
  userRole = signal<string>((localStorage.getItem('userRole') || 'USER').trim().toUpperCase());
  isAdmin = computed(() => this.userRole() === 'ADMIN');
  currentClientId = signal<string | null>(null);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const cid = params['clientId'] || params['client'];
      if (cid) {
        this.currentClientId.set(cid);
      }
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadAccount(id);
    } else {
      this.errorMessage.set('No se proporcionó un ID de cuenta válido');
      this.loading.set(false);
    }
  }

  loadAccount(id: string): void {
    console.log('Iniciando carga de cuenta con ID:', id);
    this.loading.set(true);
    this.errorMessage.set(null);
    this.accountService.getAccountById(id).subscribe({
      next: (data) => {
        console.log('Datos de cuenta recibidos:', data);
        this.account.set(data);
        if (data.clientId) {
          this.loadCustomer(data.clientId);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar detalle:', err);
        this.errorMessage.set(`Error al cargar la cuenta: ${err.message || 'Error desconocido'}.`);
        this.loading.set(false);
      }
    });
  }

  loadCustomer(clientId: string): void {
    this.customerService.getCustomerById(clientId).subscribe({
      next: (customer) => {
        if (customer) this.customer.set(customer);
      },
      error: (err) => {
        console.error('Error al cargar cliente individual:', err);
        // Fallback: intentar buscar en la lista completa si falla el individual por alguna razón de API
        this.customerService.getCustomers().subscribe({
          next: (customers) => {
            const found = customers.find(c => c.id === clientId);
            if (found) this.customer.set(found);
          }
        });
      }
    });
  }

  goToEdit(): void {
    const currentAccount = this.account();
    if (currentAccount) {
      this.router.navigate(['/accounts/edit', currentAccount.id]);
    }
  }

  toggleStatus(): void {
    const currentAccount = this.account();
    if (currentAccount && currentAccount.id) {
      this.loading.set(true);
      const newStatus = !currentAccount.status;
      this.accountService.patchAccount({ status: newStatus }, currentAccount.id).subscribe({
        next: () => {
          this.loadAccount(currentAccount.id!);
        },
        error: (err) => {
          console.error('Error al cambiar estado:', err);
          this.errorMessage.set('No se pudo cambiar el estado de la cuenta.');
          this.loading.set(false);
        }
      });
    }
  }

  confirmDelete(id: string | undefined): void {
    if (id) {
      this.showDeleteModal.set(true);
    }
  }

  onDelete(): void {
    const currentAccount = this.account();
    if (currentAccount && currentAccount.id) {
      this.loading.set(true);

      // Validación bancaria: no borrar si tiene movimientos
      this.movementService.getAllMovements({ accountId: currentAccount.id }).subscribe({
        next: (movements) => {
          if (movements && movements.length > 0) {
            this.loading.set(false);
            this.showDeleteModal.set(false);
            this.errorMessage.set('No se puede eliminar la cuenta porque tiene movimientos asociados.');
            return;
          }

          // Si no tiene movimientos, procedemos a borrar
          this.executeDelete(currentAccount.id!);
        },
        error: (err) => {
          console.warn('No se pudo verificar movimientos, procediendo con precaución:', err);
          // Si falla la verificación, por seguridad bancaria podríamos bloquear,
          // pero aquí intentaremos borrar si la API lo permite.
          this.executeDelete(currentAccount.id!);
        }
      });
    }
  }

  private executeDelete(id: string): void {
    this.accountService.deleteAccount(id).subscribe({
      next: () => {
        this.showDeleteModal.set(false);
        this.router.navigate(['/accounts']);
      },
      error: (err) => {
        console.error('Error al eliminar:', err);
        this.errorMessage.set('No se pudo eliminar la cuenta. ' + (err.error?.message || ''));
        this.loading.set(false);
        this.showDeleteModal.set(false);
      }
    });
  }

  goBack(): void {
    const queryParams: any = {};
    if (this.currentClientId()) {
      queryParams.client = this.currentClientId();
    }
    this.router.navigate(['/accounts'], { queryParams });
  }
}
