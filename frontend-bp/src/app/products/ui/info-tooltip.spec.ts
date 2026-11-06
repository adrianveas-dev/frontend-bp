import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { InfoTooltip } from './info-tooltip';

describe('Table information tooltip', () => {
  function setup() {
    const fixture = TestBed.createComponent(InfoTooltip);
    fixture.componentRef.setInput('text', 'Descripción del producto financiero.');
    fixture.componentRef.setInput('label', 'Información de descripción');
    fixture.componentRef.setInput('tooltipId', 'description-help');
    fixture.detectChanges();
    return fixture;
  }
  it('opens on hover, exposes its description and closes on mouse leave', () => {
    const fixture = setup();
    const wrapper = fixture.debugElement.query(By.css('.info'));
    expect(fixture.nativeElement.querySelector('[role="tooltip"]')).toBeNull();
    wrapper.triggerEventHandler('mouseenter');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="tooltip"]').textContent).toContain(
      'Descripción del producto',
    );
    expect(fixture.nativeElement.querySelector('button').getAttribute('aria-describedby')).toBe(
      'description-help',
    );
    wrapper.triggerEventHandler('mouseleave');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="tooltip"]')).toBeNull();
  });
  it('supports keyboard focus, Escape, click, outside dismissal and viewport changes', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const wrapper = fixture.debugElement.query(By.css('.info'));
    wrapper.triggerEventHandler('focusin');
    expect(component.visible()).toBe(true);
    fixture.nativeElement
      .querySelector('button')
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(component.visible()).toBe(false);
    fixture.nativeElement.querySelector('button').click();
    expect(component.visible()).toBe(true);
    component.outsideClick({ target: fixture.nativeElement } as Event);
    expect(component.visible()).toBe(true);
    document.body.click();
    expect(component.visible()).toBe(false);
    component.show();
    wrapper.triggerEventHandler('focusout');
    expect(component.visible()).toBe(false);
    component.show();
    window.dispatchEvent(new Event('resize'));
    expect(component.visible()).toBe(false);
    component.show();
    window.dispatchEvent(new Event('scroll'));
    expect(component.visible()).toBe(false);
  });
});
