import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatSettings } from '../../models/chat.models';
import { SettingsService } from '../../services/settings.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { DragDropModule } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule,DragDropModule],
  template: `
    <div class="admin-overlay" *ngIf="isVisible" (click)="closeAdmin()">
      <div class="admin-panel" (click)="$event.stopPropagation()">
        <div class="admin-header">
          <h2>פאנל ניהול</h2>
          <div *ngIf="isAuthenticated" class="actions">
            <button (click)="saveSettings()" class="save-btn">שמור הגדרות</button>
            <button (click)="resetSettings()" class="reset-btn">אפס הגדרות</button>
            <button class="close-btn" (click)="closeAdmin()">✕</button>
         </div>
        </div>
        
        <div *ngIf="!isAuthenticated" class="auth-section">
          <h3>הזן סיסמה</h3>
          <input type="password" 
                 [(ngModel)]="password" 
                 (keyup.enter)="authenticate()"
                 placeholder="סיסמה"
                 class="auth-input">
          <button (click)="authenticate()" class="auth-btn">כניסה</button>
        </div>
        
        <div *ngIf="isAuthenticated" class="admin-content">
          <div class="webhook-section">
            <h3>הגדרות Webhooks</h3>
            
            <div class="setting-group">
              <label>Webhook עבור הודעות צ'אט:</label>
              <input type="url" [(ngModel)]="settings.chatWebhookUrl" class="setting-input"
                     placeholder="https://api.example.com/chat">
              <small>כתובת ה-webhook שיקבל הודעות מהמשתמש ויחזיר תשובות</small>
            </div>
            
            <div class="setting-group">
              <label>Webhook עבור הגדרות:</label>
              <input type="url" [(ngModel)]="settings.settingsWebhookUrl" class="setting-input"
                     placeholder="https://api.example.com/settings">
              <small>כתובת ה-webhook לשמירה וטעינה של הגדרות</small>
            </div>
            
            <div class="setting-group">
              <label>Webhook עבור סיכום שיחה:</label>
              <input type="url" [(ngModel)]="settings.summaryWebhookUrl" class="setting-input"
                     placeholder="https://api.example.com/summary">
              <small>כתובת ה-webhook שיקבל את סיכום השיחה והליד</small>
            </div>
            
            <div class="setting-group">
              <label>Webhook כללי (לתאימות לאחור):</label>
              <input type="url" [(ngModel)]="settings.webhookUrl" class="setting-input"
                     placeholder="https://api.example.com/webhook">
              <small>כתובת webhook כללית</small>
            </div>
          </div>
          
          <div class="settings-section">
            <h3>הגדרות כלליות</h3>
            
            <div class="setting-group">
              <label>מפתח OpenAI API:</label>
              <input type="password" [(ngModel)]="settings.openaiApiKey" class="setting-input"
                     placeholder="sk-...">
              <small>מפתח API של OpenAI (אופציונלי - תלוי ב-webhook)</small>
            </div>
            
            <div class="setting-group">
              <label>כותרת הצ'אט:</label>
              <input type="text" [(ngModel)]="settings.chatTitle" class="setting-input">
            </div>
            
            <div class="setting-group">
              <label>שם הבוט:</label>
              <input type="text" [(ngModel)]="settings.botName" class="setting-input">
            </div>
            
            <div class="setting-group">
              <label>הודעת ברוכים הבאים:</label>
              <textarea [(ngModel)]="settings.welcomeMessage" class="setting-textarea"></textarea>
            </div>
            
            <div class="setting-group">
              <label>טקסט מקום לחיצה:</label>
              <input type="text" [(ngModel)]="settings.userPlaceholder" class="setting-input">
            </div>
            
            <div class="setting-group">
              <label>אייקון הצ'אט:</label>
              <input type="text" [(ngModel)]="settings.chatIcon" class="setting-input">
            </div>
          </div>
          
          <div class="collection-section">
            <h3>הגדרות איסוף נתונים</h3>

            <div cdkDropList  [cdkDropListData]="settings.questions" (cdkDropListDropped)="drop($event)">
            <div class="setting-group-question" *ngFor="let question of settings.questions; let i = index" cdkDrag>
              <div cdkDragHandle class="drag-handle">☰</div>
                <h3>שאלה {{ i + 1 }}:</h3>
                 <label>Message Key (חובה):</label>
                 <input type="text" [(ngModel)]="question.key" required class="setting-input" placeholder="example: userName">

                <select [(ngModel)]="question.type" class="setting-select">
                  <option value="text">שאלה פתוחה (טקסט)</option>
                  <option value="buttons">שאלה עם כפתורים</option>
                  <option value="card">כרטיס מידע</option>
                </select>

                <input type="text" [(ngModel)]="question.label" class="setting-input"
                       placeholder="תוכן השאלה / כותרת הכרטיס">

                <div *ngIf="question.type === 'buttons'" class="setting-group">
                  <label>כפתורים (כפתור בכל שורה):</label>
                  <textarea [(ngModel)]="question.buttonsText"
                            (ngModelChange)="updateQuestionButtons(i)"
                            class="setting-textarea"
                            placeholder="כפתור 1&#10;כפתור 2"></textarea>
                </div>

                <div *ngIf="question.type === 'card'" class="setting-group">
                  <label>תיאור הכרטיס:</label>
                  <textarea [(ngModel)]="question.description" class="setting-textarea"
                            placeholder="תיאור הכרטיס"></textarea>
                  <label>תמונה (קישור):</label>
                  <input type="text" [(ngModel)]="question.imageUrl" class="setting-input"
                         placeholder="https://example.com/image.jpg">
                </div>

                <button (click)="removeOpeningMessage(i)" class="remove-btn">הסר</button>

              </div>
            </div>
            <button (click)="addOpeningMessage()" class="add-btn">הוסף</button>
          </div>

          
          <div class="design-section">
            <h3>הגדרות עיצוב</h3>
            
            <div class="color-grid">
              <div class="setting-group">
                <label>צבע ראשי:</label>
                <input type="color" [(ngModel)]="settings.primaryColor" class="color-input">
              </div>
              
              <div class="setting-group">
                <label>צבע משני:</label>
                <input type="color" [(ngModel)]="settings.secondaryColor" class="color-input">
              </div>
              
              <div class="setting-group">
                <label>צבע טקסט:</label>
                <input type="color" [(ngModel)]="settings.textColor" class="color-input">
              </div>
              
              <div class="setting-group">
                <label>צבע רקע:</label>
                <input type="color" [(ngModel)]="settings.backgroundColor" class="color-input">
              </div>
            </div>
            
            
            <div class="setting-group">
              <label>URL תמונת רקע</label>
              <input type="url" [(ngModel)]="settings.backgroundImageUrl" class="setting-input"
                     placeholder="https://api.example.com/img.png">
              <small>כתובת URL של התמונה שתוצג כרקע הצאט</small>
            </div>


            <div class="setting-group">
              <label>פונט:</label>
              <select [(ngModel)]="settings.fontFamily" class="setting-select">
                <option value="system-ui, -apple-system, sans-serif">System UI</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="Helvetica, sans-serif">Helvetica</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="'Times New Roman', serif">Times New Roman</option>
              </select>
            </div>
            
            <div class="setting-group">
              <label>גודל פונט:</label>
              <select [(ngModel)]="settings.fontSize" class="setting-select">
                <option value="12px">קטן</option>
                <option value="14px">רגיל</option>
                <option value="16px">גדול</option>
                <option value="18px">גדול מאוד</option>
              </select>
            </div>
          </div>
          
          <div class="credit-section">
            <h3>הגדרות קרדיט</h3>
            
            <div class="setting-group">
              <label>
                <input type="checkbox" [(ngModel)]="settings.showCredit" class="setting-checkbox">
                הצג קרדיט
              </label>
            </div>
            
            <div class="setting-group">
              <label>טקסט הקרדיט:</label>
              <input type="text" [(ngModel)]="settings.creditText" class="setting-input"
                     [disabled]="!settings.showCredit"
                     placeholder="Powered by ChatBot Builder">
            </div>
            
            <div class="setting-group">
              <label>קישור הקרדיט:</label>
              <input type="url" [(ngModel)]="settings.creditUrl" class="setting-input"
                     [disabled]="!settings.showCredit"
                     placeholder="https://example.com">
            </div>
          </div>
          
          <div class="embed-section">
            <h3>קוד הטמעה</h3>
            <textarea readonly [value]="generateEmbedCode()" class="embed-code" #embedTextarea></textarea>
            <button (click)="copyEmbedCode(embedTextarea)" class="copy-btn">העתק קוד</button>
          </div>
          
          
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  isVisible = false;
  isAuthenticated = false;
  password = '';
  settings: ChatSettings = {} as ChatSettings;
  productsText: string = '';
  
  private readonly ADMIN_PASSWORD = '123';

  constructor(private settingsService: SettingsService) {}

  ngOnInit(): void {
    this.settingsService.settings$.subscribe(settings => {
      if (settings && Object.keys(settings).length > 0) {
        this.settings = { ...settings };
        this.productsText = this.settings.products ? this.settings.products.join('\n') : '';
      }
    });
  }

  
  addOpeningMessage() {
    this.settings.questions.push({ key: '', type: 'text', label: '', buttons: [], buttonsText: '', description: '', imageUrl: '' });
  }

  removeOpeningMessage(index: number) {
    this.settings.questions.splice(index, 1);
  }

  drop(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.settings.questions, event.previousIndex, event.currentIndex);
  }

  updateQuestionButtons(index: number): void {
    const text = this.settings.questions[index].buttonsText || '';
    this.settings.questions[index].buttons = text.split('\n').filter(b => b.trim() !== '');
  }

  updateProducts(): void {
    this.settings.products = this.productsText.split('\n').filter(p => p.trim().length > 0);
  }

  openAdmin(): void {
    this.isVisible = true;
  }

  closeAdmin(): void {
    this.isVisible = false;
    this.isAuthenticated = false;
    this.password = '';
  }

  authenticate(): void {
    if (this.password === this.ADMIN_PASSWORD) {
      this.isAuthenticated = true;
      this.password = '';
    } else {
      alert('סיסמה שגויה');
    }
  }

  saveSettings(): void {
    this.settingsService.updateSettings(this.settings);
    alert('הגדרות נשמרו בהצלחה');
  }

  resetSettings(): void {
    if (confirm('האם אתה בטוח שברצונך לאפס את ההגדרות?')) {
      this.settingsService.resetSettings();
      this.settingsService.settings$.subscribe(settings => {
        if (settings && Object.keys(settings).length > 0) {
          this.settings = { ...settings };
          this.productsText = this.settings.products ? this.settings.products.join('\n') : '';
        }
      });
      alert('הגדרות אופסו');
    }
  }

  generateEmbedCode(): string {
    const baseUrl = window.location.origin;
    return `<div id="chatbot-container"></div>
<script>
(function() {
  // Create chat icon
  const chatIcon = document.createElement('div');
  chatIcon.innerHTML = '${this.settings.chatIcon}';
  chatIcon.style.cssText = \`
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    background-color: ${this.settings.primaryColor};
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    color: white;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 1000;
    transition: transform 0.2s;
  \`;
  
  chatIcon.addEventListener('mouseenter', function() {
    this.style.transform = 'scale(1.1)';
  });
  
  chatIcon.addEventListener('mouseleave', function() {
    this.style.transform = 'scale(1)';
  });
  
  // Create chat overlay
  const chatOverlay = document.createElement('div');
  chatOverlay.style.cssText = \`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
    z-index: 10000;
    display: none;
  \`;
  
  const chatFrame = document.createElement('iframe');
  chatFrame.src = '${baseUrl}';
  chatFrame.style.cssText = \`
    position: fixed;
    bottom: 90px;
    right: 20px;
    width: 400px;
    height: 600px;
    border: none;
    border-radius: 8px;
    background: white;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  \`;
  
  // Mobile responsive
  if (window.innerWidth <= 768) {
    chatFrame.style.position = 'fixed';
    chatFrame.style.top = '0';
    chatFrame.style.left = '0';
    chatFrame.style.right = '0';
    chatFrame.style.bottom = '0';
    chatFrame.style.transform = 'none';
    chatFrame.style.width = '100%';
    chatFrame.style.height = '100%';
    chatFrame.style.borderRadius = '0';
  }
  
  // Position chat frame directly without overlay background on desktop
  const showChat = function() {
    if (window.innerWidth <= 768) {
      // Mobile: use overlay
      chatOverlay.style.display = 'block';
    } else {
      // Desktop: show frame directly
      chatFrame.style.display = 'block';
      document.body.appendChild(chatFrame);
    }
  };
  
  const hideChat = function() {
    if (window.innerWidth <= 768) {
      // Mobile: hide overlay
      chatOverlay.style.display = 'none';
    } else {
      // Desktop: hide frame directly
      chatFrame.style.display = 'none';
      if (chatFrame.parentNode) {
        chatFrame.parentNode.removeChild(chatFrame);
      }
    }
  };
  
  // Initially hide the chat frame
  chatFrame.style.display = 'none';
  
  chatOverlay.appendChild(chatFrame);
  
  chatIcon.addEventListener('click', function() {
    showChat();
  });
  
  chatOverlay.addEventListener('click', function(e) {
    if (e.target === chatOverlay) {
      hideChat();
    }
  });
  
  // Listen for close messages from the chat iframe
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'closeChat') {
      hideChat();
    }
  });
  
  // Handle window resize
  window.addEventListener('resize', function() {
    if (window.innerWidth <= 768) {
      chatFrame.style.position = 'fixed';
      chatFrame.style.top = '0';
      chatFrame.style.left = '0';
      chatFrame.style.right = '0';
      chatFrame.style.bottom = '0';
      chatFrame.style.transform = 'none';
      chatFrame.style.width = '100%';
      chatFrame.style.height = '100%';
      chatFrame.style.borderRadius = '0';
    } else {
      chatFrame.style.position = 'fixed';
      chatFrame.style.bottom = '90px';
      chatFrame.style.right = '20px';
      chatFrame.style.top = 'auto';
      chatFrame.style.left = 'auto';
      chatFrame.style.transform = 'none';
      chatFrame.style.width = '400px';
      chatFrame.style.height = '600px';
      chatFrame.style.borderRadius = '8px';
    }
  });
  
  document.body.appendChild(chatIcon);
  document.body.appendChild(chatOverlay);
})();
</script>`;
  }

  copyEmbedCode(textarea: HTMLTextAreaElement): void {
    textarea.select();
    document.execCommand('copy');
    alert('קוד הטמעה הועתק');
  }
}