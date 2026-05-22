import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import pt from '@angular/common/locales/pt';
import { FormsModule } from '@angular/forms';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { pt_BR, provideNzI18n } from 'ng-zorro-antd/i18n';
import { NZ_ICONS } from 'ng-zorro-antd/icon';
import {
  CarOutline,
  EnvironmentOutline,
  TeamOutline,
  ProfileOutline,
  DollarOutline,
  BarChartOutline,
  UserOutline,
  LockOutline,
  SearchOutline,
  MenuFoldOutline,
  MenuUnfoldOutline,
  LogoutOutline,
  PlusOutline,
  CheckCircleOutline,
  ClockCircleOutline,
  WalletOutline,
  QrcodeOutline,
  ArrowLeftOutline,
  ArrowRightOutline,
  CloseOutline,
  CloseCircleOutline,
  EditOutline,
  SettingOutline,
  WarningOutline,
  MenuOutline,
  IdcardOutline,
  PhoneOutline,
  ThunderboltOutline,
  DeleteOutline,
  SwapOutline,
  CalendarOutline,
  DownOutline,
  RightOutline,
  CheckOutline,
  FilePdfOutline,
  TrophyOutline,
} from '@ant-design/icons-angular/icons';

import { routes } from './app.routes';
import { authInterceptor } from './shared/interceptors/auth.interceptor';

registerLocaleData(pt);

const icons = [
  CarOutline,
  EnvironmentOutline,
  TeamOutline,
  ProfileOutline,
  DollarOutline,
  BarChartOutline,
  UserOutline,
  LockOutline,
  SearchOutline,
  MenuFoldOutline,
  MenuUnfoldOutline,
  LogoutOutline,
  PlusOutline,
  CheckCircleOutline,
  ClockCircleOutline,
  WalletOutline,
  QrcodeOutline,
  ArrowLeftOutline,
  ArrowRightOutline,
  CloseOutline,
  CloseCircleOutline,
  EditOutline,
  SettingOutline,
  WarningOutline,
  MenuOutline,
  IdcardOutline,
  PhoneOutline,
  ThunderboltOutline,
  DeleteOutline,
  SwapOutline,
  CalendarOutline,
  DownOutline,
  RightOutline,
  CheckOutline,
  FilePdfOutline,
  TrophyOutline,
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideNzI18n(pt_BR),
    importProvidersFrom(FormsModule),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: NZ_ICONS, useValue: icons },
  ],
};
