import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  get<T>(path: string, params?: Record<string, string>) {
    const httpParams = params ? new HttpParams({ fromObject: params }) : undefined;
    return this.http.get<T>(`${this.base}/${path}`, { params: httpParams });
  }

  post<T>(path: string, body: unknown) {
    return this.http.post<T>(`${this.base}/${path}`, body);
  }

  upload<T>(path: string, form: FormData) {
    return this.http.post<T>(`${this.base}/${path}`, form);
  }

  getBlob(path: string) {
    return this.http.get(`${this.base}/${path}`, { responseType: 'blob' });
  }

  get baseUrl(): string {
    return this.base;
  }

  patch<T>(path: string, body: unknown) {
    return this.http.patch<T>(`${this.base}/${path}`, body);
  }

  delete<T>(path: string) {
    return this.http.delete<T>(`${this.base}/${path}`);
  }
}
