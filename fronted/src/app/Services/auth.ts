import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { ApiService, LoginRequest, LoginResponse } from './api';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private storageKey = 'policlinico_user';

  constructor(private api: ApiService, private router: Router) {}

  login(data: LoginRequest) {
    return this.api.login(data).pipe(
      tap((user) => {
        localStorage.setItem(this.storageKey, JSON.stringify(user));
      })
    );
  }

  getUser(): LoginResponse | null {
    const raw = localStorage.getItem(this.storageKey);
    return raw ? JSON.parse(raw) : null;
  }

  isLoggedIn(): boolean {
    return this.getUser() !== null;
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
    this.router.navigate(['/login']);
  }
}
