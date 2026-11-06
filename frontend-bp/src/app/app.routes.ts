import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'products' },
  {
    path: 'products',
    loadComponent: () => import('./products/ui/product-list').then((m) => m.ProductList),
  },
  {
    path: 'products/new',
    loadComponent: () => import('./products/ui/product-form').then((m) => m.ProductForm),
  },
  {
    path: 'products/:id/edit',
    loadComponent: () => import('./products/ui/product-form').then((m) => m.ProductForm),
  },
  { path: '**', loadComponent: () => import('./not-found').then((m) => m.NotFound) },
];
