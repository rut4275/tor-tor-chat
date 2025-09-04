import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { ChatSettings, LeadData } from '../models/chat.models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(private http: HttpClient) {}

  // Chat message to webhook
  sendMessageToWebhook(message:{message:string, phase:string} ,threadId: string, conversationId: string, webhookUrl: string): Observable<any> {
    if (!webhookUrl || webhookUrl === 'https://api.example.com/chat') {
      return throwError(() => new Error('לא הוגדר webhook עבור הצ\'אט'));
    }

    const payload = {
      message,
      conversationId,
      threadId,
      timestamp: new Date().toISOString()
    };
    
    return this.http.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      timeout(60000), // 60 seconds for chat responses
      catchError(this.handleError)
    );
  }

  // Settings via webhook
  getSettingsFromWebhook(webhookUrl: string): Observable<ChatSettings> {
    if (!webhookUrl || webhookUrl === 'https://api.example.com/settings') {
      return of({} as ChatSettings);
    }

    return this.http.get<ChatSettings>(webhookUrl).pipe(
      timeout(10000),
      catchError(() => of({} as ChatSettings))
    );
  }

  updateSettingsViaWebhook(settings: Partial<ChatSettings>, webhookUrl: string): Observable<any> {
    if (!webhookUrl || webhookUrl === 'https://api.example.com/settings') {
      return of({ message: 'Settings saved locally (no webhook configured)' });
    }

    return this.http.post(webhookUrl, settings).pipe(
      timeout(10000),
      catchError(this.handleError)
    );
  }

  // Lead submission with conversation summary
  submitLeadToWebhook(leadData: LeadData & { conversationId: string }, webhookUrl: string): Observable<any> {
    if (!webhookUrl || webhookUrl === 'https://api.example.com/summary') {
      return of({ message: 'Lead saved locally (no webhook configured)' });
    }

    return this.http.post(webhookUrl, leadData).pipe(
      timeout(30000),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'נראה שיש בעיה, אנא נסה שוב בעוד מספר דקות';
    
    if (error.status === 0) {
      errorMessage = 'לא ניתן להתחבר לשרת, אנא ודא שה-webhook פועל';
    } else if (error.status === 401) {
      errorMessage = 'שגיאת הרשאה';
    } else if (error.status === 429) {
      errorMessage = 'חרגת ממגבלת הקריאות, אנא נסה שוב מאוחר יותר';
    } else if (error.error?.error) {
      errorMessage = error.error.error;
    }

    return throwError(() => new Error(errorMessage));
  }
}