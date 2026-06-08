import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../Services/auth';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login {
  credenciales = {
    correo: '',
    clave: '',
  };

  error = '';
  cargando = false;

  constructor(private auth: AuthService, private router: Router) {}

  ingresar(): void {
    this.error = '';
    this.cargando = true;

    this.auth.login(this.credenciales).subscribe({
      next: () => {
        this.cargando = false;
        this.router.navigate(['/panel']);
      },
      error: (err) => {
        this.cargando = false;
        this.error = err?.error?.error || 'Correo o clave incorrectos';
      },
    });

    
  }
}
