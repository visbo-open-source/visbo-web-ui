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
import { VisboCenterAuditComponent }  from './visbocenter-audit/visbocenter-audit.component';
import { VisboProjectAuditComponent }  from './visboproject-audit/visboproject-audit.component';

import { VisboProjectsComponent }      from './visboprojects/visboprojects.component';
import { VisboProjectDetailComponent }  from './visboproject-detail/visboproject-detail.component';
import { VisboProjectVersionsComponent }      from './visboprojectversions/visboprojectversions.component';
import { VisboProjectVersionDetailComponent }      from './visboprojectversion-detail/visboprojectversion-detail.component';

import { SettingsComponent }   from './settings/settings.component';
import { UserProfileComponent }   from './userprofile/userprofile.component';

import { SysVisboSystemComponent }  from './sysvisbosystem/sysvisbosystem.component';
import { SysVisboCentersComponent }  from './sysvisbocenters/sysvisbocenters.component';
import { SysVisboCenterDetailComponent }  from './sysvisbocenter-detail/sysvisbocenter-detail.component';
import { SysVisboProjectsComponent }  from './sysvisboprojects/sysvisboprojects.component';
import { SysVisboProjectDetailComponent }  from './sysvisboproject-detail/sysvisboproject-detail.component';
import { SysAuditComponent }  from './sysaudit/sysaudit.component';
import { SysUserComponent }  from './sysuser/sysuser.component';
import { SysLogComponent }  from './syslog/syslog.component';

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
  { path: 'vcAudit/:id', component: VisboCenterAuditComponent, canActivate: [AuthGuard]  },
  { path: 'vp', component: VisboProjectsComponent, canActivate: [AuthGuard] },
  { path: 'vp/:id', component: VisboProjectsComponent, canActivate: [AuthGuard] },
  { path: 'vpDetail/:id', component: VisboProjectDetailComponent, canActivate: [AuthGuard]  },
  { path: 'vpAudit/:id', component: VisboProjectAuditComponent, canActivate: [AuthGuard]  },
  { path: 'vpv', component: VisboProjectVersionsComponent, canActivate: [AuthGuard] },
  { path: 'vpv/:id', component: VisboProjectVersionsComponent, canActivate: [AuthGuard] },
  { path: 'vpvDetail/:id', component: VisboProjectVersionDetailComponent, canActivate: [AuthGuard]  },
  { path: 'settings', component: SettingsComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: UserProfileComponent, canActivate: [AuthGuard] },
  { path: 'sysadmins', component: SysVisboSystemComponent, canActivate: [AuthGuard] },
  { path: 'sysvc', component: SysVisboCentersComponent, canActivate: [AuthGuard] },
  { path: 'sysvcDetail/:id', component: SysVisboCenterDetailComponent, canActivate: [AuthGuard] },
  { path: 'sysvp/:id', component: SysVisboProjectsComponent, canActivate: [AuthGuard] },
  { path: 'sysvpDetail/:id', component: SysVisboProjectDetailComponent, canActivate: [AuthGuard] },
  { path: 'sysaudit', component: SysAuditComponent, canActivate: [AuthGuard] },
  { path: 'sysuser', component: SysUserComponent, canActivate: [AuthGuard] },
  { path: 'syslog', component: SysLogComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' }
];

@NgModule({
  imports: [ RouterModule.forRoot(routes) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule { }
