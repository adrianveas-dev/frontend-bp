import {
  Component,
  ElementRef,
  HostListener,
  Input,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';

@Component({
  selector: 'app-info-tooltip',
  template: `
    <span
      class="info"
      (mouseenter)="show()"
      (mouseleave)="hide()"
      (focusin)="show()"
      (focusout)="hide()"
      (keydown.escape)="hide()"
    >
      <button
        #trigger
        type="button"
        class="info-trigger"
        [attr.aria-label]="label"
        [attr.aria-describedby]="visible() ? tooltipId : null"
        (click)="show()"
      >
        <svg class="info-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <circle cx="8" cy="5" r="0.9" fill="white" />
          <path d="M8 7.5v3.8" stroke="white" stroke-width="1.6" stroke-linecap="round" />
        </svg>
      </button>
      @if (visible()) {
        <span class="tooltip-position" [style.top.px]="top()" [style.left.px]="left()">
          <span class="tooltip" role="tooltip" [id]="tooltipId">{{ text }}</span>
        </span>
      }
    </span>
  `,
  styles: `
    :host,
    .info {
      display: inline-flex;
      vertical-align: middle;
    }
    .info-trigger {
      display: inline-grid;
      place-items: center;
      border: 0;
      width: 20px;
      height: 20px;
      padding: 4px;
      background: transparent;
      color: #95989e;
      cursor: help;
      border-radius: 50%;
    }
    .info-trigger:hover,
    .info-trigger:focus-visible {
      color: #737780;
    }
    .info-icon {
      display: block;
      width: 12px;
      height: 12px;
    }
    .tooltip-position {
      position: fixed;
      z-index: 20;
      width: 240px;
      max-width: calc(100vw - 24px);
      padding-top: 8px;
    }
    .tooltip {
      display: block;
      border-radius: 5px;
      padding: 12px 14px;
      background: #263650;
      color: white;
      font-size: 12px;
      font-weight: 400;
      line-height: 1.5;
      text-align: left;
      white-space: normal;
      box-shadow: 0 4px 14px #17264c26;
    }
  `,
})
export class InfoTooltip {
  @Input({ required: true }) text = '';
  @Input({ required: true }) label = '';
  @Input({ required: true }) tooltipId = '';
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  readonly visible = signal(false);
  readonly top = signal(0);
  readonly left = signal(0);

  constructor() {
    fromEvent(window, 'scroll', { capture: true })
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.hide());
  }

  show() {
    const rect = this.trigger().nativeElement.getBoundingClientRect();
    this.top.set(rect.bottom);
    this.left.set(Math.max(12, Math.min(rect.left - 110, window.innerWidth - 252)));
    this.visible.set(true);
  }
  hide() {
    this.visible.set(false);
  }
  @HostListener('document:click', ['$event']) outsideClick(event: Event) {
    if (!this.host.nativeElement.contains(event.target as Node)) this.hide();
  }
  @HostListener('window:resize') resize() {
    this.hide();
  }
}
