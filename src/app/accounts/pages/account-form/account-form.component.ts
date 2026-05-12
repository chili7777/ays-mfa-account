import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountService } from '../../services/account.service';
import { CustomerService } from '../../services/customer.service';
import { MovementService } from '../../services/movement.service';
import { Customer } from '../../interfaces/customer.interface';

@Component({
  selector: 'app-account-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './account-form.component.html',
  styleUrl: './account-form.component.scss'
})
export class AccountFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly accountService = inject(AccountService);
  private readonly customerService = inject(CustomerService);
  private readonly movementService = inject(MovementService);

  accountForm: FormGroup;
  isEdit = false;
  accountId: string | null = null;
  hasMovements = signal<boolean>(false);
  customers = signal<Customer[]>([]);
  customerSearchTerm = signal<string>('');
  showCustomerDropdown = signal<boolean>(false);
  selectedClientId = signal<string | null>(null);
  currentStep = signal<number>(1);
  totalSteps = 3;

  filteredCustomers = computed(() => {
    const term = this.customerSearchTerm().toLowerCase().trim();
    if (!term) return this.customers();
    return this.customers().filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.identification.toLowerCase().includes(term)
    );
  });

  selectedCustomerName = computed(() => {
    const clientId = this.selectedClientId();
    if (!clientId) return 'Seleccione un cliente';

    // Si aún no cargan los clientes, mostrar el ID como fallback
    if (this.customers().length === 0) return 'Cargando información...';

    const customer = this.customers().find(c => c.id === clientId);
    return customer ? `${customer.name} (${customer.identification})` : `ID: ${clientId}`;
  });

  get f() { return this.accountForm.controls; }

  constructor() {
    this.accountForm = this.fb.group({
      clientId: ['', [Validators.required]],
      accountNumber: ['', [
        Validators.required,
        Validators.pattern('^[0-9]+$'),
        Validators.minLength(6),
        Validators.maxLength(10)
      ]],
      accountType: ['SAVINGS', [Validators.required]],
      initialBalance: [0, [Validators.required, Validators.min(0)]],
      status: [true]
    });
  }

  loadCustomers(): void {
    this.customerService.getCustomers().subscribe({
      next: (data) => this.customers.set(data),
      error: (err) => console.error('Error al cargar clientes', err)
    });
  }

  toggleCustomerDropdown(): void {
    if (this.isEdit) return; // No permitir cambiar cliente en edición
    this.showCustomerDropdown.update(v => !v);
    if (this.showCustomerDropdown()) {
      this.customerSearchTerm.set('');
      // Foco programático al abrir
      setTimeout(() => {
        const input = document.querySelector('.dropdown-panel input') as HTMLInputElement;
        if (input) input.focus();
      }, 100);
    }
  }

  selectCustomer(customer: Customer): void {
    const clientId = customer.id || (customer as any).customerId || (customer as any).idCustomer;
    if (clientId) {
      this.selectedClientId.set(clientId);
      this.accountForm.patchValue({ clientId: clientId });
      this.accountForm.get('clientId')?.markAsTouched();
    }
    this.showCustomerDropdown.set(false);
  }

  ngOnInit(): void {
    this.loadCustomers();
    this.accountId = this.route.snapshot.paramMap.get('id');
    if (this.accountId) {
      this.isEdit = true;
      // En modo edición, algunos campos suelen ser inmutables en sistemas bancarios
      this.accountForm.get('clientId')?.disable();
      this.accountForm.get('accountNumber')?.disable();
      this.accountForm.get('initialBalance')?.disable();
      this.loadAccount(this.accountId);
    }
  }

  private originalAccount: any;

  loadAccount(id: string): void {
    this.accountService.getAccountById(id).subscribe({
      next: (account) => {
        this.originalAccount = account;
        this.accountForm.patchValue({
          clientId: account.clientId,
          accountNumber: account.accountNumber,
          accountType: account.accountType,
          initialBalance: account.initialBalance,
          status: account.status
        });
        this.selectedClientId.set(account.clientId);

        // Verificar movimientos para permitir editar saldo inicial
        this.checkMovements(id);
      },
      error: (err) => {
        console.error('Error al cargar la cuenta', err);
        alert('No se pudo cargar la información de la cuenta');
        this.goBack();
      }
    });
  }

  private checkMovements(accountId: string): void {
    this.movementService.getAllMovements({ accountId }).subscribe({
      next: (movements) => {
        const hasMovs = movements.length > 0;
        this.hasMovements.set(hasMovs);

        if (!hasMovs) {
          this.accountForm.get('initialBalance')?.enable();
        } else {
          this.accountForm.get('initialBalance')?.disable();
        }
      },
      error: (err) => {
        console.error('Error al verificar movimientos', err);
        // Por seguridad, si falla la verificación, lo dejamos deshabilitado
        this.hasMovements.set(true);
        this.accountForm.get('initialBalance')?.disable();
      }
    });
  }

  onSubmit(): void {
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      alert('Por favor, complete todos los campos requeridos correctamente.');
      return;
    }

    const formValue = this.accountForm.getRawValue();

    if (this.isEdit) {
      // Intentamos con PATCH para una actualización más sutil y compatible
      // Enviamos solo lo que puede haber cambiado o lo que la API permite
      const updateData: any = {
        accountType: formValue.accountType,
        status: formValue.status
      };

      // Si no tiene movimientos, permitimos enviar el nuevo saldo inicial
      if (!this.hasMovements()) {
        updateData.initialBalance = formValue.initialBalance;
      }

      this.accountService.patchAccount(updateData, this.accountId!).subscribe({
        next: () => {
          alert('Cuenta actualizada correctamente');
          this.goBack();
        },
        error: (err) => {
          console.error('Error al actualizar con PATCH', err);
          // Si falla PATCH, intentamos con PUT como fallback (objeto completo)
          this.accountService.updateAccount(formValue, this.accountId!).subscribe({
            next: () => {
              alert('Cuenta actualizada correctamente');
              this.goBack();
            },
            error: (errPut) => {
              console.error('Error al actualizar con PUT', errPut);
              const errorMsg = errPut.error?.detail || errPut.error?.message || 'Error al actualizar la cuenta';
              alert(errorMsg);
            }
          });
        }
      });
    } else {
      this.accountService.createAccount(formValue).subscribe({
        next: () => {
          alert('Cuenta creada correctamente');
          this.goBack();
        },
        error: (err) => {
          console.error('Error al crear', err);
          alert('Error al crear la cuenta');
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/accounts']);
  }

  nextStep(): void {
    if (this.isStepValid()) {
      if (this.currentStep() < this.totalSteps) {
        this.currentStep.update(s => s + 1);
      }
    } else {
      this.markStepAsTouched();
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  isStepValid(): boolean {
    const step = this.currentStep();
    if (step === 1) {
      const clientId = this.accountForm.get('clientId');
      const accountNumber = this.accountForm.get('accountNumber');
      return (clientId?.valid || clientId?.disabled || false) &&
             (accountNumber?.valid || accountNumber?.disabled || false);
    }
    if (step === 2) {
      const accountType = this.accountForm.get('accountType');
      const initialBalance = this.accountForm.get('initialBalance');
      return (accountType?.valid || accountType?.disabled || false) &&
             (initialBalance?.valid || initialBalance?.disabled || false);
    }
    return true;
  }

  markStepAsTouched(): void {
    const step = this.currentStep();
    if (step === 1) {
      this.accountForm.get('clientId')?.markAsTouched();
      this.accountForm.get('accountNumber')?.markAsTouched();
    }
    if (step === 2) {
      this.accountForm.get('accountType')?.markAsTouched();
      this.accountForm.get('initialBalance')?.markAsTouched();
    }
  }
}
