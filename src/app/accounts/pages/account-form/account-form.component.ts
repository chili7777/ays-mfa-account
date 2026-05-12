import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountService } from '../../services/account.service';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../interfaces/customer.interface';

@Component({
  selector: 'app-account-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './account-form.component.html',
  styleUrl: './account-form.component.scss'
})
export class AccountFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly accountService = inject(AccountService);
  private readonly customerService = inject(CustomerService);

  accountForm: FormGroup;
  isEdit = false;
  accountId: string | null = null;
  customers = signal<Customer[]>([]);
  currentStep = signal<number>(1);
  totalSteps = 3;

  get f() { return this.accountForm.controls; }

  constructor() {
    this.accountForm = this.fb.group({
      clientId: ['', [Validators.required]],
      accountNumber: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
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
      },
      error: (err) => {
        console.error('Error al cargar la cuenta', err);
        alert('No se pudo cargar la información de la cuenta');
        this.goBack();
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
      // Para el PUT enviamos el objeto completo (incluyendo campos deshabilitados)
      // Aseguramos que el accountId esté en el cuerpo
      const updateData = {
        ...formValue,
        accountId: this.accountId
      };

      this.accountService.updateAccount(updateData, this.accountId!).subscribe({
        next: () => {
          alert('Cuenta actualizada correctamente');
          this.goBack();
        },
        error: (err) => {
          console.error('Error al actualizar', err);
          const errorMsg = err.error?.detail || err.error?.message || 'Error al actualizar la cuenta';
          alert(errorMsg);
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
      return (this.accountForm.get('clientId')?.valid ?? false) &&
             (this.accountForm.get('accountNumber')?.valid ?? false);
    }
    if (step === 2) {
      return (this.accountForm.get('accountType')?.valid ?? false) &&
             (this.accountForm.get('initialBalance')?.valid ?? false);
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
