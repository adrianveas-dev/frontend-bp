import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { NotFound } from './not-found';
describe('Application shell', () => {
  it('renders the bank header and the not-found route', () => {
    TestBed.configureTestingModule({ imports: [App, NotFound], providers: [provideRouter([])] });
    expect(TestBed.createComponent(App).nativeElement).toBeTruthy();
    const app = TestBed.createComponent(App);
    app.detectChanges();
    expect(app.nativeElement.textContent).toContain('BANCO');
    const missing = TestBed.createComponent(NotFound);
    missing.detectChanges();
    expect(missing.nativeElement.textContent).toContain('Página no encontrada');
  });
});
