import { Routes } from '@angular/router';
import { AccountsListComponent } from './accounts/pages/accounts-list/accounts-list.component';
import { AccountDetailComponent } from './accounts/pages/account-detail/account-detail.component';
import { AccountFormComponent } from './accounts/pages/account-form/account-form.component';

export const routes: Routes = [
  { path: '', redirectTo: 'accounts', pathMatch: 'full' },
  { path: 'accounts', component: AccountsListComponent },
  { path: 'accounts/create', component: AccountFormComponent },
  { path: 'accounts/detail/:id', component: AccountDetailComponent },
  { path: 'accounts/edit/:id', component: AccountFormComponent },
];
