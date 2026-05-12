import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountService } from '../../services/account.service';
import { Account } from '../../interfaces/account.interface';

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

  account = signal<Account | null>(null);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
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
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar detalle:', err);
        this.errorMessage.set(`Error al cargar la cuenta: ${err.message || 'Error desconocido'}.`);
        this.loading.set(false);
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

  goBack(): void {
    this.router.navigate(['/accounts']);
  }
}
