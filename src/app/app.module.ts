import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

// Authentication
import { LoginComponent } from './login/login.component';
import { AlertComponent } from './_directives/alert.component';
import { AuthGuard } from './_guards/auth.guard';
import { JwtInterceptor } from './_helpers/jwt.interceptor';
import { AuthenticationService } from './_services/authentication.service';
import { UserService } from './_services/user.service';
import { RegisterComponent } from './register/register.component';
import { RegisterConfirmComponent } from './registerconfirm/registerconfirm.component';
import { PWForgottenComponent } from './pwforgotten/pwforgotten.component';
import { PWResetComponent } from './pwreset/pwreset.component';

import { AlertService } from './_services/alert.service';

import { NavbarComponent } from './navbar/navbar.component';

import { MessagesComponent } from './messages/messages.component';
import { SettingsComponent } from './settings/settings.component';
import { UserProfileComponent } from './userprofile/userprofile.component';

import { MessageService } from './_services/message.service';

// Visbo Centers
import { VisboCentersComponent } from './visbocenters/visbocenters.component';
import { VisboCenterDetailComponent } from './visbocenter-detail/visbocenter-detail.component';
import { VisboCenterAuditComponent }  from './visbocenter-audit/visbocenter-audit.component';

import { VisboCenterService } from './_services/visbocenter.service';
import { VisboAuditService } from './_services/visboaudit.service';
import { SysUserService } from './_services/sysuser.service';

// Visbo Projects
import { VisboProjectService } from './_services/visboproject.service';
import { VisboProjectsComponent } from './visboprojects/visboprojects.component';
import { VisboProjectDetailComponent } from './visboproject-detail/visboproject-detail.component';
import { VisboProjectAuditComponent }  from './visboproject-audit/visboproject-audit.component';

// Visbo Project Versions
import { VisboProjectVersionService } from './_services/visboprojectversion.service';
import { VisboProjectVersionsComponent } from './visboprojectversions/visboprojectversions.component';

import { DashboardComponent } from './dashboard/dashboard.component';

// Sys Admin / App Admin
import { SysNavbarComponent } from './sysnavbar/sysnavbar.component';
import { SysVisboSystemComponent } from './sysvisbosystem/sysvisbosystem.component';
import { SysVisboCentersComponent } from './sysvisbocenters/sysvisbocenters.component';
import { SysVisboCenterDetailComponent }  from './sysvisbocenter-detail/sysvisbocenter-detail.component';
import { SysVisboProjectsComponent }  from './sysvisboprojects/sysvisboprojects.component';
import { SysVisboProjectDetailComponent }  from './sysvisboproject-detail/sysvisboproject-detail.component';

import { SysAuditComponent }  from './sysaudit/sysaudit.component';
import { SysUserComponent }  from './sysuser/sysuser.component';
import { SysLogComponent }  from './syslog/syslog.component';
import { SysLogService } from './_services/syslog.service';

@NgModule({
  declarations: [
    AppComponent,
    AlertComponent,
    VisboCentersComponent,
    VisboCenterDetailComponent,
    VisboCenterAuditComponent,
    VisboProjectsComponent,
    VisboProjectDetailComponent,
    VisboProjectVersionsComponent,
    MessagesComponent,
    SettingsComponent,
    UserProfileComponent,
    DashboardComponent,
    NavbarComponent,
    LoginComponent,
    RegisterComponent,
    RegisterConfirmComponent,
    PWForgottenComponent,
    PWResetComponent,
    SysNavbarComponent,
    SysVisboCentersComponent,
    SysVisboSystemComponent,
    SysVisboCenterDetailComponent,
    SysVisboProjectsComponent,
    SysVisboProjectDetailComponent,
    VisboProjectAuditComponent,
    SysAuditComponent,
    SysUserComponent,
    SysLogComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    // MaterialModule,
    HttpClientModule
  ],
  providers: [
    AuthGuard,
    AlertService,
    AuthenticationService,
    UserService,
    VisboCenterService,
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
  bootstrap: [ AppComponent ]
})
export class AppModule { }
