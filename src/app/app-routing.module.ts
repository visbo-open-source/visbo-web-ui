import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './authentication/login/login.component';
import { RegisterComponent } from './authentication/register/register.component';
import { RegisterconfirmComponent } from './authentication/registerconfirm/registerconfirm.component';
import { OauthconfirmComponent } from './authentication/oauthconfirm/oauthconfirm.component';
import { AuthGuard } from './_guards/auth.guard';
import { PwforgottenComponent } from './authentication/pwforgotten/pwforgotten.component';
import { PwresetComponent } from './authentication/pwreset/pwreset.component';

import { DashboardComponent } from './dashboard/dashboard.component';
import { VisboCentersComponent } from './visbocenters/visbocenters.component';
import { VisbocenterDetailComponent } from './visbocenter-detail/visbocenter-detail.component';
import { VisbocenterAuditComponent } from './visbocenter-audit/visbocenter-audit.component';
import { VisboprojectAuditComponent } from './visboproject-audit/visboproject-audit.component';

import { VisboProjectsComponent } from './visboprojects/visboprojects.component';
import { VisboprojectDetailComponent } from './visboproject-detail/visboproject-detail.component';
import { VisboProjectVersionsComponent } from './visboprojectversions/visboprojectversions.component';
import { VisboPortfolioVersionsComponent } from './visboportfolio/visboportfolio.component';
import { VisboPortfolioCmpComponent } from './visboportfolio-cmp/visboportfolio-cmp.component';

import { VisboProjectKeyMetricsComponent } from './visboproject-keymetrics/visboproject-keymetrics.component';
import { VisboprojectRestrictComponent } from './visboproject-restrict/visboproject-restrict.component';
// import { VisboPortfolioVersionDetailComponent } from './visboprojectversion-detail/visboprojectversion-detail.component';

import { SettingsComponent } from './settings/settings.component';
import { UserProfileComponent } from './userprofile/userprofile.component';

import { SysvisbosystemComponent } from './visbosysadmin/sysvisbosystem/sysvisbosystem.component';
import { SysVisboCentersComponent } from './visbosysadmin/sysvisbocenters/sysvisbocenters.component';
import { SysvisbocenterDetailComponent } from './visbosysadmin/sysvisbocenter-detail/sysvisbocenter-detail.component';
import { SysVisboProjectsComponent } from './visbosysadmin/sysvisboprojects/sysvisboprojects.component';
import { SysvisboprojectDetailComponent } from './visbosysadmin/sysvisboproject-detail/sysvisboproject-detail.component';
import { SysauditComponent } from './visbosysadmin/sysaudit/sysaudit.component';
import { SysuserComponent } from './visbosysadmin/sysuser/sysuser.component';
import { SysLogComponent } from './visbosysadmin/syslog/syslog.component';
import { SystasksComponent } from './visbosysadmin/systasks/systasks.component';
import { SysconfigComponent } from './visbosysadmin/sysconfig/sysconfig.component';
import { SyssettingsComponent } from './visbosysadmin/syssettings/syssettings.component';

import { EmployeeComponent } from './_components/comp-employeetable/comp-employeetable.component';
import { ApproverComponent } from './_components/comp-approvertable/comp-approvertable.component';


const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'registerconfirm', component: RegisterconfirmComponent },
  { path: 'oauthconfirm', component: OauthconfirmComponent },
  { path: 'register/:id', component: RegisterComponent },
  { path: 'pwforgotten', component: PwforgottenComponent },
  { path: 'pwreset', component: PwresetComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard]  },
  { path: 'vtr', component: EmployeeComponent, canActivate: [AuthGuard]  },  
  { path: 'vtrApprove', component: ApproverComponent, canActivate: [AuthGuard]  },
  { path: 'vc', component: VisboCentersComponent, canActivate: [AuthGuard] },
  { path: 'vcDetail/:id', component: VisbocenterDetailComponent, canActivate: [AuthGuard]  },
  { path: 'vcAudit/:id', component: VisbocenterAuditComponent, canActivate: [AuthGuard]  },
  { path: 'vp', component: VisboProjectsComponent, canActivate: [AuthGuard] },
  { path: 'vp/:id', component: VisboProjectsComponent, canActivate: [AuthGuard] },
  { path: 'vpDetail/:id', component: VisboprojectDetailComponent, canActivate: [AuthGuard]  },
  { path: 'vpAudit/:id', component: VisboprojectAuditComponent, canActivate: [AuthGuard]  },
// old URLs showing individual pages
  { path: 'vpViewCost/:id', component: VisboProjectKeyMetricsComponent, canActivate: [AuthGuard]  },
  { path: 'vpViewDeadlines/:id', component: VisboProjectKeyMetricsComponent, canActivate: [AuthGuard]  },
  { path: 'vpViewDeliveries/:id', component: VisboProjectKeyMetricsComponent, canActivate: [AuthGuard]  },
  { path: 'vpView/:id', component: VisboProjectKeyMetricsComponent, canActivate: [AuthGuard]  },
  { path: 'vpKeyMetrics/:id', component: VisboProjectKeyMetricsComponent, canActivate: [AuthGuard] },
  { path: 'vpRestrict/:id', component: VisboprojectRestrictComponent, canActivate: [AuthGuard]  },
  { path: 'vpv', component: VisboProjectVersionsComponent, canActivate: [AuthGuard] },
  { path: 'vpv/:id', component: VisboProjectVersionsComponent, canActivate: [AuthGuard] },
  { path: 'vpf/:id', component: VisboPortfolioVersionsComponent, canActivate: [AuthGuard] },
  { path: 'vpfcmp/:id', component: VisboPortfolioCmpComponent, canActivate: [AuthGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: UserProfileComponent, canActivate: [AuthGuard] },
  { path: 'sysadmins', component: SysvisbosystemComponent, canActivate: [AuthGuard] },
  { path: 'sysvc', component: SysVisboCentersComponent, canActivate: [AuthGuard] },
  { path: 'sysvcDetail/:id', component: SysvisbocenterDetailComponent, canActivate: [AuthGuard] },
  { path: 'sysvp/:id', component: SysVisboProjectsComponent, canActivate: [AuthGuard] },
  { path: 'sysvpDetail/:id', component: SysvisboprojectDetailComponent, canActivate: [AuthGuard] },
  { path: 'sysaudit', component: SysauditComponent, canActivate: [AuthGuard] },
  { path: 'sysuser', component: SysuserComponent, canActivate: [AuthGuard] },
  { path: 'syslog', component: SysLogComponent, canActivate: [AuthGuard] },
  { path: 'systasks', component: SystasksComponent, canActivate: [AuthGuard] },
  { path: 'sysconfig', component: SysconfigComponent, canActivate: [AuthGuard] },
  { path: 'syssetting', component: SyssettingsComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard'}
];

@NgModule({
  imports: [ RouterModule.forRoot(routes, { onSameUrlNavigation: 'reload', relativeLinkResolution: 'legacy' }) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule { }
