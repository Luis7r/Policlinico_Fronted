import { Routes } from '@angular/router';
import { Registro } from './registro/registro';
import { Login } from './login/login';
import { Panel } from './panel/panel';
import { Sidebar } from './sidebar/sidebar';


export const routes: Routes = [
    {
      path: '',
      component: Login
    },
    {
      path: 'sidebar',
      component: Sidebar
    },
    {
      path: 'login',
      component: Login
    },
    {
      path: 'registro',
      component: Registro
    },
    {
      path: 'panel',
      component: Panel
    },
    {
      path: '**',
      redirectTo: 'login'
    }
];
