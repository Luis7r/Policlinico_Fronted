import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface MenuItem {
  label: string;
  icon?: string;
  path?: string;
  action?: () => void;
}

@Component({
  selector: 'sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: 'sidebar.html',
  styleUrls: ['sidebar.css'],
})
export class Sidebar {
  @Input() userInfo: any;
  @Input() pageTitle: string = 'Panel';
  @Input() menuItems: MenuItem[] = [];
  @Output() logout = new EventEmitter<void>();

  isOpen = false;

  toggleSidebar(): void {
    this.isOpen = !this.isOpen;
  }

  closeOnMobile(): void {
    if (window.innerWidth < 768) {
      this.isOpen = false;
    }
  }

  handleMenuClick(item: MenuItem): void {
    if (item.action) {
      item.action();
    }
    this.closeOnMobile();
  }

  handleLogout(): void {
    this.logout.emit();
    this.isOpen = false;
  }

  displayName(): string {
    if (this.userInfo?.nombreCompleto) return this.userInfo.nombreCompleto;
    if (this.userInfo?.rol === 'ADMIN') return 'Administrador';
    return 'Usuario';
  }

  displayCode(): string {
    return this.userInfo?.codigo || 'Sin codigo';
  }
}
