import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountService } from '../../services/account.service';

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

  accountForm: FormGroup;
  isEdit = false;
  accountId: string | null = null;

  constructor() {
    this.accountForm = this.fb.group({
      clientId: ['', [Validators.required]],
      accountNumber: ['', [Validators.required]],
      accountType: ['SAVINGS', [Validators.required]],
      initialBalance: [0, [Validators.required, Validators.min(0)]],
      status: [true]
    });
  }

  ngOnInit(): void {
    this.accountId = this.route.snapshot.paramMap.get('id');
    if (this.accountId) {
      this.isEdit = true;
      // En modo edición, deshabilitar campos que no se pueden editar según CURL
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
    if (this.accountForm.invalid) return;

    const formValue = this.accountForm.getRawValue();

    if (this.isEdit) {
      const isOnlyTypeChanged =
        formValue.accountType !== this.originalAccount?.accountType &&
        formValue.status === this.originalAccount?.status;

      const updateData = {
        accountType: formValue.accountType,
        status: formValue.status
      };

      if (isOnlyTypeChanged) {
        this.accountService.patchAccount({ accountType: formValue.accountType }, this.accountId!).subscribe({
          next: () => {
            alert('Tipo de cuenta actualizado correctamente');
            this.goBack();
          },
          error: (err) => alert('Error al actualizar el tipo de cuenta')
        });
      } else {
        this.accountService.updateAccount(updateData, this.accountId!).subscribe({
          next: () => {
            alert('Cuenta actualizada correctamente');
            this.goBack();
          },
          error: (err) => alert('Error al actualizar la cuenta')
        });
      }
    } else {
      this.accountService.createAccount(formValue).subscribe({
        next: () => {
          alert('Cuenta creada correctamente');
          this.goBack();
        },
        error: (err) => alert('Error al crear la cuenta')
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/accounts']);
  }
}
