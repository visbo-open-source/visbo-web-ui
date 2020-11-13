import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { RegisterconfirmComponent } from './registerconfirm/registerconfirm.component';
import { OauthconfirmComponent } from './oauthconfirm/oauthconfirm.component';
import { AuthGuard } from './_guards/auth.guard';
import { PwforgottenComponent } from './pwforgotten/pwforgotten.component';
import { PwresetComponent } from './pwreset/pwreset.component';

import { DashboardComponent } from './dashboard/dashboard.component';
import { VisboCentersComponent } from './visbocenters/visbocenters.component';
import { VisbocenterDetailComponent } from './visbocenter-detail/visbocenter-detail.component';
import { VisbocenterAuditComponent } from './visbocenter-audit/visbocenter-audit.component';
import { VisboprojectAuditComponent } from './visboproject-audit/visboproject-audit.component';

import { VisboProjectsComponent } from './visboprojects/visboprojects.component';
import { VisboprojectDetailComponent } from './visboproject-detail/visboproject-detail.component';
import { VisboProjectVersionsComponent } from './visboprojectversions/visboprojectversions.component';
import { VisboPortfolioVersionsComponent } from './visboportfolio-versions/visboportfolio-versions.component';
import { VisboProjectKeyMetricsComponent } from './visboproject-keymetrics/visboproject-keymetrics.component';
import { VisboProjectViewVPVComponent } from './visboproject-viewvpv/visboproject-viewvpv.component';
import { VisboProjectViewCostComponent } from './visboproject-viewcost/visboproject-viewcost.component';
import { VisboProjectViewDeliveryComponent } from './visboproject-viewdelivery/visboproject-viewdelivery.component';
import { VisboProjectViewDeadlineComponent } from './visboproject-viewdeadline/visboproject-viewdeadline.component';
import { VisboprojectRestrictComponent } from './visboproject-restrict/visboproject-restrict.component';
// import { VisboPortfolioVersionDetailComponent } from './visboprojectversion-detail/visboprojectversion-detail.component';

import { SettingsComponent } from './settings/settings.component';
import { UserProfileComponent } from './userprofile/userprofile.component';

import { SysvisbosystemComponent } from './sysvisbosystem/sysvisbosystem.component';
import { SysVisboCentersComponent } from './sysvisbocenters/sysvisbocenters.component';
import { SysvisbocenterDetailComponent } from './sysvisbocenter-detail/sysvisbocenter-detail.component';
import { SysVisboProjectsComponent } from './sysvisboprojects/sysvisboprojects.component';
import { SysvisboprojectDetailComponent } from './sysvisboproject-detail/sysvisboproject-detail.component';
import { SysauditComponent } from './sysaudit/sysaudit.component';
import { SysuserComponent } from './sysuser/sysuser.component';
import { SysLogComponent } from './syslog/syslog.component';
import { SystasksComponent } from './systasks/systasks.component';
import { SysconfigComponent } from './sysconfig/sysconfig.component';


const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'registerconfirm', component: RegisterconfirmComponent },
  { path: 'oauthconfirm', component: OauthconfirmComponent },
  { path: 'register/:id', component: RegisterComponent },
  { path: 'pwforgotten', component: PwforgottenComponent },
  { path: 'pwreset', component: PwresetComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard]  },
  { path: 'vc', component: VisboCentersComponent, canActivate: [AuthGuard] },
  { path: 'vcDetail/:id', component: VisbocenterDetailComponent, canActivate: [AuthGuard]  },
  { path: 'vcAudit/:id', component: VisbocenterAuditComponent, canActivate: [AuthGuard]  },
  { path: 'vp', component: VisboProjectsComponent, canActivate: [AuthGuard] },
  { path: 'vp/:id', component: VisboProjectsComponent, canActivate: [AuthGuard] },
  { path: 'vpDetail/:id', component: VisboprojectDetailComponent, canActivate: [AuthGuard]  },
  { path: 'vpAudit/:id', component: VisboprojectAuditComponent, canActivate: [AuthGuard]  },
  { path: 'vpKeyMetrics/:id', component: VisboProjectKeyMetricsComponent, canActivate: [AuthGuard]  },
  { path: 'vpView/:id', component: VisboProjectViewVPVComponent, canActivate: [AuthGuard] },
  { path: 'vpViewCost/:id', component: VisboProjectViewCostComponent, canActivate: [AuthGuard]  },
  { path: 'vpViewDelivery/:id', component: VisboProjectViewDeliveryComponent, canActivate: [AuthGuard] },
  { path: 'vpViewDeadline/:id', component: VisboProjectViewDeadlineComponent, canActivate: [AuthGuard] },
  { path: 'vpRestrict/:id', component: VisboprojectRestrictComponent, canActivate: [AuthGuard]  },
  { path: 'vpv', component: VisboProjectVersionsComponent, canActivate: [AuthGuard] },
  { path: 'vpv/:id', component: VisboProjectVersionsComponent, canActivate: [AuthGuard] },
  { path: 'vpf/:id', component: VisboPortfolioVersionsComponent, canActivate: [AuthGuard] },
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
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' }
];

@NgModule({
  imports: [ RouterModule.forRoot(routes, {onSameUrlNavigation: 'reload'}) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule { }
