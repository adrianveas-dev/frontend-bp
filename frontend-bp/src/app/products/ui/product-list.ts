import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductRepository } from '../domain/product.repository';
import { errorMessage } from '../data/product-api';
import { filterProducts, Product } from '../domain/product';
import { InfoTooltip } from './info-tooltip';
import { Subscription, timer } from 'rxjs';

@Component({
  selector: 'app-product-list',
  imports: [RouterLink, DatePipe, InfoTooltip],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList {
  private readonly repository = inject(ProductRepository);
  private readonly destroyRef = inject(DestroyRef);
  readonly products = signal<Product[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  private noticeTimer?: Subscription;
  readonly query = signal('');
  readonly size = signal(5);
  readonly page = signal(1);
  readonly menu = signal<string | null>(null);
  readonly selected = signal<Product | null>(null);
  readonly deleting = signal(false);
  readonly deleteError = signal('');
  readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private returnFocus?: HTMLElement;
  readonly filtered = computed(() => filterProducts(this.products(), this.query()));
  readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.size())));
  readonly visible = computed(() =>
    this.filtered().slice((this.page() - 1) * this.size(), this.page() * this.size()),
  );
  readonly start = computed(() =>
    this.filtered().length ? (this.page() - 1) * this.size() + 1 : 0,
  );
  readonly end = computed(() => Math.min(this.page() * this.size(), this.filtered().length));
  constructor() {
    const { notice, ...navigationState } = history.state ?? {};
    if (typeof notice === 'string' && notice) {
      history.replaceState(navigationState, '');
      this.showNotice(notice);
    }
    this.load();
  }
  showNotice(message: string) {
    this.dismissNotice();
    this.notice.set(message);
    this.noticeTimer = timer(3000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.notice.set(''));
  }
  dismissNotice() {
    this.noticeTimer?.unsubscribe();
    this.notice.set('');
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.repository
      .all()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products) => {
          this.products.set(products);
          this.page.set(1);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(errorMessage(error));
          this.loading.set(false);
        },
      });
  }
  search(value: string) {
    this.query.set(value);
    this.page.set(1);
    this.menu.set(null);
  }
  resize(value: string) {
    this.size.set(Number(value));
    this.page.set(1);
    this.menu.set(null);
  }
  move(delta: number) {
    this.page.set(Math.max(1, Math.min(this.pages(), this.page() + delta)));
    this.menu.set(null);
  }
  toggleMenu(id: string, event: Event) {
    event.stopPropagation();
    this.menu.set(this.menu() === id ? null : id);
  }
  @HostListener('document:click') closeMenu() {
    this.menu.set(null);
  }
  @HostListener('document:keydown.escape') escape() {
    this.closeMenu();
  }
  askDelete(product: Product) {
    const active = document.activeElement as HTMLElement;
    this.returnFocus = active.closest('td')?.querySelector<HTMLElement>('.menu-trigger') ?? active;
    this.selected.set(product);
    this.deleteError.set('');
    this.menu.set(null);
    this.dialog()?.nativeElement.showModal();
  }
  cancel(event?: Event) {
    event?.preventDefault();
    if (this.deleting()) return;
    this.dialog()?.nativeElement.close();
    this.selected.set(null);
    if (this.returnFocus?.isConnected) this.returnFocus.focus();
    else document.getElementById('search')?.focus();
  }
  confirmDelete() {
    const product = this.selected();
    if (!product || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set('');
    this.repository
      .remove(product.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.products.update((products) => products.filter((item) => item.id !== product.id));
          this.page.set(Math.min(this.page(), this.pages()));
          this.deleting.set(false);
          this.cancel();
          document.getElementById('search')?.focus();
          this.showNotice('Producto eliminado correctamente.');
        },
        error: (error) => {
          this.deleting.set(false);
          this.deleteError.set(errorMessage(error));
        },
      });
  }
  imageFailed(event: Event) {
    (event.target as HTMLImageElement).hidden = true;
  }
}
