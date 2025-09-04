import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timeout, catchError } from 'rxjs';
import { WebhookResponse, LeadData } from '../models/chat.models';

@Injectable({
  providedIn: 'root'
})
export class WebhookService {
  constructor(private http: HttpClient) {}

  sendToOpenAI(apiKey: string, message: string): Observable<any> {
    const payload = {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 500
    };

    return this.http.post('https://api.openai.com/v1/chat/completions', payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    }).pipe(
      timeout(60000), // 60 seconds timeout
      catchError(this.handleError)
    );
  }

  sendLeadData(webhookUrl: string, leadData: LeadData): Observable<any> {
    return this.http.post(webhookUrl, leadData, {
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      timeout(30000),
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'נראה שיש בעיה, אנא נסה שוב בעוד מספר דקות';
    
    if (error.name === 'TimeoutError') {
      errorMessage = 'נראה שיש בעיה, אנא נסה שוב בעוד מספר דקות';
    } else if (error.status === 0) {
      errorMessage = 'בעיית חיבור לשרת, אנא נסה שוב';
    }

    return throwError(() => new Error(errorMessage));
  }
}