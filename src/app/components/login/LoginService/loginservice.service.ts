import { HttpClient } from '@angular/common/http';
import { Injectable, ɵɵqueryRefresh } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { Loggeduser } from '../LoggedUser/loggeduser';
import { Router, defaultUrlMatcher } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../../environments/environment.development';
import { UserRegister } from '../../register/UserRegister/user-register';
import { Changes } from '../../profile/ChangesClass/changes';
import { PasswordChanges } from '../../change-password/PasswordChanges/password-changes';
import { AbstractControl } from '@angular/forms';
import Swal from 'sweetalert2';
declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: any;
  }
}
@Injectable({
  providedIn: 'root',
})
export class Loginservice {
  constructor(public http: HttpClient, private router: Router) {
    this.loadFacebookSDK();
  }
  LoggedUser = new BehaviorSubject(null);
  Token: string | null = '';
  IsLogged: boolean = false;
  AddUser(Role: string, RegisteredUser: UserRegister): Observable<any> {
    return this.http.post(
      `${environment.baseUrl}/Account/Register?Role=${Role}`,
      RegisteredUser
    );
  }
  passwordMatchValidator(
    control: AbstractControl
  ): { [key: string]: boolean } | null {
    const password = control.get('NewPassword');
    const confirmPassword = control.get('ConfirmPassword');
    if (
      password &&
      confirmPassword &&
      password.value !== confirmPassword.value
    ) {
      return { passwordMismatch: true };
    }
    return null;
  }
  LogUser(LoggedUser: Loggeduser): Observable<any> {
    return this.http.post(`${environment.baseUrl}/Account/Login`, LoggedUser);
  }
  loadFacebookSDK(): void {
    window.fbAsyncInit = () => {
      window.FB.init({
        appId: '748132960538873', // Replace with your Facebook App ID
        cookie: true,
        xfbml: true,
        version: 'v11.0',
      });
      window.FB.AppEvents.logPageView();
    };
    (function (d, s, id) {
      let js: HTMLScriptElement;
      const fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) {
        return;
      }
      js = d.createElement(s) as HTMLScriptElement;
      js.id = id;
      js.src = 'https://connect.facebook.net/en_US/sdk.js';
      fjs.parentNode!.insertBefore(js, fjs);
    })(document, 'script', 'facebook-jssdk');
  }
  facebookLogin(): void {
    window.FB.login(
      (response: any) => {
        if (response.authResponse) {
          window.FB.api(
            '/me',
            { fields: 'first_name,last_name,email' },
            (userInfo: any) => {
              this.http
                .post(
                  `${environment.baseUrl}/Account/RegisterUsingFaceBook`,
                  userInfo
                )
                .subscribe({
                  next: (res: any) => {
                    this.DecodeUser(res['token']);
                    location.reload();
                    this.RouteConsideringToRole();
                  },
                  error: (err: any) => {
                    Swal.fire({
                      title: 'Choose a Role',
                      input: 'select',
                      inputOptions: {
                        Candidate: 'Candidate',
                        Employer: 'Employer',
                      },
                    }).then((value) => {
                      this.facebookRegister(userInfo, value.value);
                    });
                  },
                });
            }
          );
        } else {
          alert('User cancelled login or did not fully authorize.');
        }
      },
      { scope: 'public_profile,email' }
    );
  }
  facebookRegister(user: any, role: any): void {
    this.RequestfacebookRegister(user, role).subscribe({
      next: (response) => {
        this.DecodeUser(response['token']);
        location.reload();
        this.RouteConsideringToRole();
      },
      error: (error) => {
        Swal.fire({
          title: 'Error',
          text: error['error']['msg'],
          showCancelButton: true,
        });
      },
    });
  }
  RequestfacebookRegister(user: any, role: any): Observable<any> {
    return this.http.post(
      `${environment.baseUrl}/Account/RegisterUsingFaceBook?Role=${role}`,
      user
    );
  }
  IfTokenIsExpired() {
    this.DecodeUser(localStorage.getItem('HelperPlanJWTToken'));
    if (new Date(this.LoggedUser.value!['exp'] * 1000) < new Date()) {
      return true;
    } else {
      return false;
    }
  }
  DecodeUser(Token: any) {
    localStorage.setItem('HelperPlanJWTToken', Token);
    this.Token = Token;
    let DecodedUser: any = jwtDecode(
      localStorage.getItem('HelperPlanJWTToken')!
    );
    this.LoggedUser.next(DecodedUser);
    this.IsLogged = true;
  }
  RouteConsideringToRole() {
    switch (
      this.LoggedUser.value![
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
      ]
    ) {
      case 'Candidate':
        this.router.navigateByUrl('/job');
        break;
      case 'Employer':
        this.router.navigateByUrl('/candidatepage');
        break;
      case 'Admin':
        this.router.navigateByUrl('/dashboard/adminDashboard');
        break;
    }
  }
  GetUserDetails(): Observable<any> {
    return this.http.get(
      `${environment.baseUrl}/Account/GetUserDetails?UserId=${
        this.LoggedUser.value![
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'
        ]
      }`
    );
  }
  UpdateUser(changes: Changes): Observable<any> {
    return this.http.patch(
      `${environment.baseUrl}/Account/UpdateUser?UserId=${
        this.LoggedUser.value![
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'
        ]
      }`,
      changes
    );
  }
  UpdateUserPassword(PasswordChanges: PasswordChanges): Observable<any> {
    return this.http.patch(
      `${environment.baseUrl}/Account/UpdateUserPassword?UserId=${
        this.LoggedUser.value![
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'
        ]
      }`,
      PasswordChanges
    );
  }
  LogOutUser() {
    localStorage.removeItem('HelperPlanJWTToken');
    this.IsLogged = false;
    this.LoggedUser.next(null);
    this.Token = null;
    this.router.navigate(['/Login']);
  }
}
