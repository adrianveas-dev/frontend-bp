import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template:
    '<section style="padding: 80px 24px; text-align: center"><h1>Página no encontrada</h1><p>La dirección que buscas no está disponible.</p><a class="button primary" routerLink="/products">Volver al listado</a></section>',
})
export class NotFound {}
