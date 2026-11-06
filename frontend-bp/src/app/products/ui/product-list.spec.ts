import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ProductList } from './product-list';
import { ProductRepository } from '../domain/product.repository';
import { Product } from '../domain/product';

const products: Product[] = Array.from({ length: 12 }, (_, index) => ({
  id: `id${index}`,
  name: `Tarjeta ${index}`,
  description: 'Compras diarias',
  logo: 'invalid.png',
  date_release: '2028-01-01',
  date_revision: '2029-01-01',
}));
describe('Product list', () => {
  let fixture: ComponentFixture<ProductList>;
  let component: ProductList;
  let repository: { all: jest.Mock; remove: jest.Mock };
  beforeEach(() => {
    repository = { all: jest.fn(() => of(products)), remove: jest.fn(() => of({})) };
    TestBed.configureTestingModule({
      imports: [ProductList],
      providers: [provideRouter([]), { provide: ProductRepository, useValue: repository }],
    });
    fixture = TestBed.createComponent(ProductList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('renders products, filters, resets page and changes page size', () => {
    expect(fixture.nativeElement.textContent).toContain('Tarjeta 0');
    expect(component.visible()).toHaveLength(5);
    expect(component.pages()).toBe(3);
    component.move(1);
    expect(component.start()).toBe(6);
    expect(component.end()).toBe(10);
    component.search('ID11');
    expect(component.page()).toBe(1);
    expect(component.visible()[0].id).toBe('id11');
    component.search('');
    component.resize('10');
    expect(component.visible()).toHaveLength(10);
    component.resize('20');
    expect(component.visible()).toHaveLength(12);
    component.search('missing');
    fixture.detectChanges();
    expect(component.start()).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('No encontramos');
    component.search('');
    component.products.set([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Todavía no hay');
  });
  it('consumes navigation messages once and dismisses them after three seconds', () => {
    jest.useFakeTimers();
    fixture.destroy();
    history.replaceState({ notice: 'Producto creado correctamente.', navigationId: 7 }, '');
    fixture = TestBed.createComponent(ProductList);
    component = fixture.componentInstance;
    expect(component.notice()).toBe('Producto creado correctamente.');
    expect(history.state).toEqual({ navigationId: 7 });
    jest.advanceTimersByTime(2999);
    expect(component.notice()).not.toBe('');
    jest.advanceTimersByTime(1);
    expect(component.notice()).toBe('');
    fixture.destroy();
    fixture = TestBed.createComponent(ProductList);
    expect(fixture.componentInstance.notice()).toBe('');
    fixture.destroy();
    history.replaceState({}, '');
    jest.useRealTimers();
  });
  it('restarts the timer for new messages and supports manual dismissal', () => {
    jest.useFakeTimers();
    component.showNotice('Creado');
    jest.advanceTimersByTime(2000);
    component.showNotice('Eliminado');
    jest.advanceTimersByTime(1000);
    expect(component.notice()).toBe('Eliminado');
    component.dismissNotice();
    expect(component.notice()).toBe('');
    component.showNotice('Actualizado');
    fixture.destroy();
    jest.advanceTimersByTime(3000);
    expect(component.notice()).toBe('Actualizado');
    jest.useRealTimers();
  });
  it('shows loading and retries after a network failure', () => {
    const pending = new Subject<Product[]>();
    repository.all.mockReturnValue(pending);
    component.load();
    fixture.detectChanges();
    expect(component.loading()).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('.skeleton')).toHaveLength(30);
    pending.error(new HttpErrorResponse({ status: 0 }));
    fixture.detectChanges();
    expect(component.error()).toContain('conectar');
    repository.all.mockReturnValue(of(products));
    component.load();
    expect(component.error()).toBe('');
  });
  it('toggles menus and supports escape and outside click', () => {
    const event = new Event('click');
    jest.spyOn(event, 'stopPropagation');
    component.toggleMenu('id0', event);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="menu"]')).toBeTruthy();
    component.toggleMenu('id0', event);
    expect(component.menu()).toBeNull();
    component.toggleMenu('id1', event);
    component.escape();
    expect(component.menu()).toBeNull();
    component.toggleMenu('id1', event);
    component.closeMenu();
    expect(component.menu()).toBeNull();
  });
  it('cancels deletion, restores focus and deletes only on confirmation', () => {
    const trigger = fixture.nativeElement.querySelector('.menu-trigger') as HTMLButtonElement;
    trigger.focus();
    component.askDelete(products[0]);
    fixture.detectChanges();
    expect(component.selected()).toEqual(products[0]);
    component.cancel(new Event('cancel'));
    expect(repository.remove).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
    component.confirmDelete();
    expect(repository.remove).not.toHaveBeenCalled();
    component.askDelete(products[0]);
    component.confirmDelete();
    expect(repository.remove).toHaveBeenCalledWith('id0');
    expect(component.products()).toHaveLength(11);
    expect(component.notice()).toContain('eliminado');
  });
  it('blocks repeated deletes and keeps the modal open on failure', () => {
    const pending = new Subject();
    repository.remove.mockReturnValue(pending);
    component.askDelete(products[0]);
    component.confirmDelete();
    component.confirmDelete();
    component.cancel();
    expect(repository.remove).toHaveBeenCalledTimes(1);
    expect(component.selected()).not.toBeNull();
    pending.error(new HttpErrorResponse({ status: 404 }));
    expect(component.deleteError()).toContain('no existe');
    expect(component.deleting()).toBe(false);
    repository.remove.mockReturnValue(throwError(() => new Error()));
    component.confirmDelete();
    expect(component.deleteError()).toContain('inesperado');
    const image = document.createElement('img');
    component.imageFailed({ target: image } as unknown as Event);
    expect(image.hidden).toBe(true);
  });
});
