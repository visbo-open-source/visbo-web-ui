import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

// import { AngularFontAwesomeModule } from 'angular-font-awesome';

// Authentication
import { LoginComponent } from './login/login.component';
import { AlertComponent } from './_directives/alert.component';
import { AuthGuard } from './_guards/auth.guard';
import { JwtInterceptor } from './_helpers/jwt.interceptor';
import { AuthenticationService } from './_services/authentication.service';
import { UserService } from './_services/user.service';
import { RegisterComponent } from './register/register.component';
import { RegisterconfirmComponent } from './registerconfirm/registerconfirm.component';
import { PwforgottenComponent } from './pwforgotten/pwforgotten.component';
import { PwresetComponent } from './pwreset/pwreset.component';

import { AlertService } from './_services/alert.service';

import { NavbarComponent } from './navbar/navbar.component';

import { MessagesComponent } from './messages/messages.component';
import { LogoutTimerComponent } from './logouttimer/logouttimer.component';
import { SettingsComponent } from './settings/settings.component';
import { UserProfileComponent } from './userprofile/userprofile.component';

import { MessageService } from './_services/message.service';

// Visbo Centers
import { VisboCentersComponent } from './visbocenters/visbocenters.component';
import { VisbocenterDetailComponent } from './visbocenter-detail/visbocenter-detail.component';
import { VisbocenterAuditComponent }  from './visbocenter-audit/visbocenter-audit.component';

import { VisboCenterService } from './_services/visbocenter.service';
import { VisboAuditService } from './_services/visboaudit.service';
import { VisboSettingService } from './_services/visbosetting.service';
import { SysUserService } from './_services/sysuser.service';

// Visbo Projects
import { VisboProjectService } from './_services/visboproject.service';
import { VisboProjectsComponent } from './visboprojects/visboprojects.component';
import { VisboprojectDetailComponent } from './visboproject-detail/visboproject-detail.component';
import { VisboprojectAuditComponent }  from './visboproject-audit/visboproject-audit.component';

// Visbo Project Versions
import { VisboProjectVersionService } from './_services/visboprojectversion.service';
import { VisboProjectVersionsComponent } from './visboprojectversions/visboprojectversions.component';
import { VisboProjectVersionDetailComponent } from './visboprojectversion-detail/visboprojectversion-detail.component';

import { DashboardComponent } from './dashboard/dashboard.component';

// Sys Admin / App Admin
import { SysNavbarComponent } from './sysnavbar/sysnavbar.component';
import { SysvisbosystemComponent } from './sysvisbosystem/sysvisbosystem.component';
import { SysVisboCentersComponent } from './sysvisbocenters/sysvisbocenters.component';
import { SysvisbocenterDetailComponent }  from './sysvisbocenter-detail/sysvisbocenter-detail.component';
import { SysVisboProjectsComponent }  from './sysvisboprojects/sysvisboprojects.component';
import { SysvisboprojectDetailComponent }  from './sysvisboproject-detail/sysvisboproject-detail.component';

import { SysauditComponent }  from './sysaudit/sysaudit.component';
import { SysuserComponent }  from './sysuser/sysuser.component';
import { SysLogComponent }  from './syslog/syslog.component';
import { SysLogService } from './_services/syslog.service';
import { SystasksComponent } from './systasks/systasks.component';
import { SysconfigComponent } from './sysconfig/sysconfig.component';

import { GoogleChartModule } from './google-chart/google-chart.module';

@NgModule({
  declarations: [
    AppComponent,
    AlertComponent,
    VisboCentersComponent,
    VisbocenterDetailComponent,
    VisbocenterAuditComponent,
    VisboProjectsComponent,
    VisboprojectDetailComponent,
    VisboprojectAuditComponent,
    VisboProjectVersionsComponent,
    VisboProjectVersionDetailComponent,
    MessagesComponent,
    LogoutTimerComponent,
    SettingsComponent,
    UserProfileComponent,
    DashboardComponent,
    NavbarComponent,
    LoginComponent,
    RegisterComponent,
    RegisterconfirmComponent,
    PwforgottenComponent,
    PwresetComponent,
    SysNavbarComponent,
    SysVisboCentersComponent,
    SysvisbosystemComponent,
    SysvisbocenterDetailComponent,
    SysVisboProjectsComponent,
    SysvisboprojectDetailComponent,
    SysauditComponent,
    SysuserComponent,
    SysLogComponent,
    SystasksComponent,
    SysconfigComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    // AngularFontAwesomeModule,
    // MaterialModule,
    HttpClientModule,
    GoogleChartModule
  ],
  providers: [
    AuthGuard,
    AlertService,
    AuthenticationService,
    UserService,
    VisboCenterService,
    VisboSettingService,
    VisboProjectService,
    VisboProjectVersionService,
    VisboAuditService,
    SysUserService,
    SysLogService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true
    },
    MessageService
  ],
  bootstrap: [
    AppComponent
  ]
})
export class AppModule { }
