import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountService } from '../../services/account.service';
import { CustomerService } from '../../services/customer.service';
import { MovementService } from '../../services/movement.service';
import { Customer } from '../../interfaces/customer.interface';
import { MfeBridgeService } from '../../../core/services/mfe-bridge.service';

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
  private readonly mfeBridge = inject(MfeBridgeService);

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
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Datos sincronizados desde el Bridge
  userRole = computed(() => (this.mfeBridge.sessionData().role || 'USER').toUpperCase());
  currentClientId = computed(() => this.mfeBridge.sessionData().clientId);

  isAdmin = computed(() => this.userRole().includes('ADMIN'));

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
    // Solo ADMIN puede cambiar el cliente en modo creación
    if (this.isEdit || !this.isAdmin()) return;

    this.showCustomerDropdown.update(v => !v);
    if (this.showCustomerDropdown()) {
      this.customerSearchTerm.set('');
      // Foco programático al abrir con reintento para asegurar que el input esté en el DOM
      setTimeout(() => {
        const input = document.querySelector('.dropdown-panel input') as HTMLInputElement;
        if (input) {
          input.focus();
        } else {
          // Reintento si el primer intento falló (por delay de animación/render)
          setTimeout(() => {
            const retryInput = document.querySelector('.dropdown-panel input') as HTMLInputElement;
            if (retryInput) retryInput.focus();
          }, 50);
        }
      }, 150);
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

    // Suscribirse a queryParams para capturar el clientId si viene en la URL
    this.route.queryParams.subscribe(params => {
      const cid = params['clientId'] || params['client'];
      if (cid && !this.accountId) {
        this.selectedClientId.set(cid);
        this.accountForm.patchValue({ clientId: cid });

        // Si es ADMIN, aseguramos que el campo esté habilitado para permitirle cambiar el titular si lo desea
        // Si no es ADMIN (USER), bloqueamos el campo para que solo pueda crear cuentas para sí mismo
        if (this.isAdmin()) {
          this.accountForm.get('clientId')?.enable();
        } else {
          this.accountForm.get('clientId')?.disable();
        }
      }
    });

    // Si el usuario no es ADMIN y estamos creando, y no vino por URL, usamos localStorage
    if (!this.isAdmin() && !this.accountId && !this.selectedClientId()) {
      const cid = this.currentClientId();
      if (cid) {
        this.selectedClientId.set(cid);
        this.accountForm.patchValue({ clientId: cid });
        this.accountForm.get('clientId')?.disable();
      } else {
        console.warn('USER role detected but no clientId found in localStorage or URL');
      }
    }

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
        this.showErrorMessage('No se pudo cargar la información de la cuenta');
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
      this.showErrorMessage('Por favor, complete todos los campos requeridos correctamente.');
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
          this.showSuccessMessage('Cuenta actualizada correctamente');
          setTimeout(() => this.goBack(), 1500);
        },
        error: (err) => {
          console.error('Error al actualizar con PATCH', err);
          // Si falla PATCH, intentamos con PUT como fallback (objeto completo)
          this.accountService.updateAccount(formValue, this.accountId!).subscribe({
            next: () => {
              this.showSuccessMessage('Cuenta actualizada correctamente');
              setTimeout(() => this.goBack(), 1500);
            },
            error: (errPut) => {
              console.error('Error al actualizar con PUT', errPut);
              const errorMsg = errPut.error?.detail || errPut.error?.message || 'Error al actualizar la cuenta';

              if (errorMsg.includes('número de cuenta ya existe')) {
                this.accountForm.get('accountNumber')?.setErrors({ duplicate: true });
                this.currentStep.set(1);
              }

              this.showErrorMessage(errorMsg);
            }
          });
        }
      });
    } else {
      this.accountService.createAccount(formValue).subscribe({
        next: () => {
          this.showSuccessMessage('Cuenta creada correctamente');
          setTimeout(() => this.goBack(true), 1500);
        },
        error: (err) => {
          console.error('Error al crear', err);
          const errorMsg = err.error?.detail || err.error?.message || 'Error al crear la cuenta';

          if (errorMsg.includes('número de cuenta ya existe')) {
            this.accountForm.get('accountNumber')?.setErrors({ duplicate: true });
            this.currentStep.set(1);
          } else if (errorMsg.includes('no existe')) {
            // Caso de integridad: el cliente no existe
            this.accountForm.get('clientId')?.setErrors({ notFound: true });
            this.currentStep.set(1);
            alert('Debe seleccionar un cliente válido para crear la cuenta');
          }

          this.showErrorMessage(errorMsg);
        }
      });
    }
  }

  private showErrorMessage(message: string): void {
    this.errorMessage.set(message);
    setTimeout(() => {
      if (this.errorMessage() === message) this.errorMessage.set(null);
    }, 8000);
  }

  private showSuccessMessage(message: string): void {
    this.successMessage.set(message);
    setTimeout(() => {
      if (this.successMessage() === message) this.successMessage.set(null);
    }, 5000);
  }

  goBack(clean: boolean = false): void {
    if (clean) {
      this.router.navigate(['/accounts']);
    } else {
      this.router.navigate(['/accounts'], { queryParamsHandling: 'preserve' });
    }
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
