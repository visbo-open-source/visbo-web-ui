import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent }      from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { RegisterConfirmComponent } from './registerconfirm/registerconfirm.component';
import { AuthGuard } from './_guards/auth.guard';
import { PWForgottenComponent } from './pwforgotten/pwforgotten.component';
import { PWResetComponent } from './pwreset/pwreset.component';

import { DashboardComponent }   from './dashboard/dashboard.component';
import { VisboCentersComponent }      from './visbocenters/visbocenters.component';
import { VisboCenterDetailComponent }  from './visbocenter-detail/visbocenter-detail.component';
import { VisboProjectsComponent }      from './visboprojects/visboprojects.component';
import { VisboProjectDetailComponent }  from './visboproject-detail/visboproject-detail.component';
import { VisboProjectVersionsComponent }      from './visboprojectversions/visboprojectversions.component';
import { SettingsComponent }   from './settings/settings.component';
import { UserProfileComponent }   from './userprofile/userprofile.component';

import { SysVisboSystemComponent }  from './sysvisbosystem/sysvisbosystem.component';
import { SysVisboCentersComponent }  from './sysvisbocenters/sysvisbocenters.component';
import { SysVisboCenterDetailComponent }  from './sysvisbocenter-detail/sysvisbocenter-detail.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'registerconfirm', component: RegisterConfirmComponent },
  { path: 'register/:id', component: RegisterComponent },
  { path: 'pwforgotten', component: PWForgottenComponent },
  { path: 'pwreset', component: PWResetComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard]  },
  { path: 'vc', component: VisboCentersComponent, canActivate: [AuthGuard] },
  { path: 'vcDetail/:id', component: VisboCenterDetailComponent, canActivate: [AuthGuard]  },
  { path: 'vp', component: VisboProjectsComponent, canActivate: [AuthGuard] },
  { path: 'vp/:id', component: VisboProjectsComponent, canActivate: [AuthGuard] },
  { path: 'vpDetail/:id', component: VisboProjectDetailComponent, canActivate: [AuthGuard]  },
  { path: 'vpv', component: VisboProjectVersionsComponent, canActivate: [AuthGuard] },
  { path: 'vpv/:id', component: VisboProjectVersionsComponent, canActivate: [AuthGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: UserProfileComponent, canActivate: [AuthGuard] },
  { path: 'sysadmins', component: SysVisboSystemComponent, canActivate: [AuthGuard] },
  { path: 'sysvc', component: SysVisboCentersComponent, canActivate: [AuthGuard] },
  { path: 'sysvcDetail/:id', component: SysVisboCenterDetailComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' }
];

@NgModule({
  imports: [ RouterModule.forRoot(routes) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule { }
