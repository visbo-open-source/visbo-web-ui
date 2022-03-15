import { BrowserModule, Title } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

// import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { SafeUrlPipe } from './_guards/safe-url.pipe';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AngularResizeEventModule } from 'angular-resize-event';

// import ngx-translate and the http loader
import {TranslateLoader, TranslateModule} from '@ngx-translate/core';
import {TranslateHttpLoader} from '@ngx-translate/http-loader';
// import { AngularFontAwesomeModule } from 'angular-font-awesome';

// Authentication
import { LoginComponent } from './authentication/login/login.component';
import { AlertComponent } from './_directives/alert.component';
import { AuthGuard } from './_guards/auth.guard';
import { JwtInterceptor } from './_helpers/jwt.interceptor';
import { AuthenticationService } from './_services/authentication.service';
import { UserService } from './_services/user.service';
import { RegisterComponent } from './authentication/register/register.component';
import { RegisterconfirmComponent } from './authentication/registerconfirm/registerconfirm.component';
import { OauthconfirmComponent } from './authentication/oauthconfirm/oauthconfirm.component';
import { PwforgottenComponent } from './authentication/pwforgotten/pwforgotten.component';
import { PwresetComponent } from './authentication/pwreset/pwreset.component';

import { AlertService } from './_services/alert.service';

import { NavbarComponent } from './navbar/navbar.component';

import { LogoutTimerComponent } from './authentication/logouttimer/logouttimer.component';
import { SettingsComponent } from './settings/settings.component';
import { UserProfileComponent } from './userprofile/userprofile.component';

import { MessageService } from './_services/message.service';

// Visbo Centers
import { VisboCentersComponent } from './visbocenters/visbocenters.component';
import { VisbocenterDetailComponent } from './visbocenter-detail/visbocenter-detail.component';
import { VisbocenterAuditComponent } from './visbocenter-audit/visbocenter-audit.component';

import { VisboCenterService } from './_services/visbocenter.service';
import { VisboAuditService } from './_services/visboaudit.service';
import { VisboSettingService } from './_services/visbosetting.service';
import { SysUserService } from './_services/sysuser.service';

// Visbo Projects
import { VisboProjectService } from './_services/visboproject.service';
import { VisboProjectsComponent } from './visboprojects/visboprojects.component';
import { VisboprojectDetailComponent } from './visboproject-detail/visboproject-detail.component';
import { VisboprojectAuditComponent } from './visboproject-audit/visboproject-audit.component';
import { VisboProjectKeyMetricsComponent } from './visboproject-keymetrics/visboproject-keymetrics.component';
import { VisboCompViewVPComponent } from './_components/comp-viewvp/comp-viewvp.component';
import { VisboCompViewKeyMetricsComponent } from './_components/comp-viewkeymetrics/comp-viewkeymetrics.component';
import { VisboCompViewDeliveryComponent } from './_components/comp-viewdelivery/comp-viewdelivery.component';
import { VisboCompViewDeadlineComponent } from './_components/comp-viewdeadline/comp-viewdeadline.component';
import { VisboCompViewCostComponent } from './_components/comp-viewcost/comp-viewcost.component';
import { VisboCompViewCapacityComponent } from './_components/comp-viewcapacity/comp-viewcapacity.component';
import { VisboCompViewCapacityCmpComponent } from './_components/comp-viewcapacitycmp/comp-viewcapacitycmp.component';
import { VisboCompViewBoardComponent } from './_components/comp-viewboard/comp-viewboard.component';
import { VisboCompViewBubbleComponent } from './_components/comp-viewbubble/comp-viewbubble.component';
import { VisboCompViewVPFComponent } from './_components/comp-viewvpf/comp-viewvpf.component';
import { VisboCompOverviewVPFComponent } from './_components/comp-overviewvpf/comp-overviewvpf.component';
import { VisboCompViewVpfCmpComponent } from './_components/comp-viewvpfcmp/comp-viewvpfcmp.component';
import { VisboprojectRestrictComponent } from './visboproject-restrict/visboproject-restrict.component';

// Visbo Project Versions
import { VisboProjectVersionService } from './_services/visboprojectversion.service';
import { VisboProjectVersionsComponent } from './visboprojectversions/visboprojectversions.component';

// Visbo Portfolio Versions
import { VisboPortfolioVersionsComponent } from './visboportfolio/visboportfolio.component';
import { VisboPortfolioCmpComponent } from './visboportfolio-cmp/visboportfolio-cmp.component';

import { DashboardComponent } from './dashboard/dashboard.component';

// Sys Admin / App Admin
import { SysNavbarComponent } from './visbosysadmin/sysnavbar/sysnavbar.component';
import { SysvisbosystemComponent } from './visbosysadmin/sysvisbosystem/sysvisbosystem.component';
import { SysVisboCentersComponent } from './visbosysadmin/sysvisbocenters/sysvisbocenters.component';
import { SysvisbocenterDetailComponent } from './visbosysadmin/sysvisbocenter-detail/sysvisbocenter-detail.component';
import { SysVisboProjectsComponent } from './visbosysadmin/sysvisboprojects/sysvisboprojects.component';
import { SysvisboprojectDetailComponent } from './visbosysadmin/sysvisboproject-detail/sysvisboproject-detail.component';

import { SysauditComponent } from './visbosysadmin/sysaudit/sysaudit.component';
import { SysuserComponent } from './visbosysadmin/sysuser/sysuser.component';
import { SysLogComponent } from './visbosysadmin/syslog/syslog.component';
import { SysLogService } from './_services/syslog.service';
import { SystasksComponent } from './visbosysadmin/systasks/systasks.component';
import { SysconfigComponent } from './visbosysadmin/sysconfig/sysconfig.component';
import { SyssettingsComponent } from './visbosysadmin/syssettings/syssettings.component';

import { EnvServiceProvider } from './_helpers/env.service.provider';

import { GoogleChartModule } from './_chart/google-chart.module';

@NgModule({
  declarations: [
    AppComponent,
    SafeUrlPipe,
    AlertComponent,
    VisboCentersComponent,
    VisbocenterDetailComponent,
    VisbocenterAuditComponent,
    VisboProjectsComponent,
    VisboprojectDetailComponent,
    VisboprojectAuditComponent,
    VisboProjectKeyMetricsComponent,
    VisboCompViewVPComponent,
    VisboCompViewKeyMetricsComponent,
    VisboCompViewDeliveryComponent,
    VisboCompViewDeadlineComponent,
    VisboCompViewCostComponent,
    VisboCompViewCapacityComponent,
    VisboCompViewCapacityCmpComponent,
    VisboCompViewBoardComponent,
    VisboCompViewBubbleComponent,
    VisboCompViewVPFComponent,
    VisboCompOverviewVPFComponent,
    VisboCompViewVpfCmpComponent,
    VisboprojectRestrictComponent,
    VisboProjectVersionsComponent,
    VisboPortfolioVersionsComponent,
    VisboPortfolioCmpComponent,
    LogoutTimerComponent,
    SettingsComponent,
    UserProfileComponent,
    DashboardComponent,
    NavbarComponent,
    LoginComponent,
    RegisterComponent,
    RegisterconfirmComponent,
    OauthconfirmComponent,
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
    SysconfigComponent,
    SyssettingsComponent
  ],
  imports: [
    BrowserModule,
    // NgbModule,
    FormsModule,
    AppRoutingModule,
    AngularResizeEventModule,
    // AngularFontAwesomeModule,
    // MaterialModule,
    HttpClientModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    }),
    GoogleChartModule
  ],
  providers: [
    Title,
    DatePipe,
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
    MessageService,
    EnvServiceProvider
  ],
  bootstrap: [
    AppComponent
  ]
})
export class AppModule { }

// required for AOT compilation
export function HttpLoaderFactory(http: HttpClient): TranslateHttpLoader {
    return new TranslateHttpLoader(http);
}
