import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatMessage, ChatSettings, ChatStep, MessageType,Answer,LeadData } from '../../models/chat.models';
import { SettingsService } from '../../services/settings.service';
import { ApiService } from '../../services/api.service';
import { AdminComponent } from '../admin/admin.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminComponent],
  template: `
  
    <div *ngIf="isLoadingSettings" class="loading-container">
      <div class="spinner"></div>
    </div>

    <div *ngIf="!isLoadingSettings" class="chat-container" [style.background-color]="settings.backgroundColor" [style.background-image]="settings.backgroundImageUrl ? 'url(' + settings.backgroundImageUrl + ')' : ''">
      <div class="chat-header" [style.background-color]="settings.primaryColor">
        <div class="chat-icon">{{ settings.chatIcon }}</div>
          <h3 [style.color]="settings.backgroundColor">{{ settings.chatTitle }}</h3>
        </div>
      <div class="chat-messages" #messagesContainer>
       <div *ngFor="let message of messages" class="message-wrapper">
        <div class="message" 
        [class.user-message]="message.isUser"
        [class.bot-message]="!message.isUser"
        [style.background-color]="message.isUser ? settings.primaryColor : '#f3f4f6dc'"
        [style.color]="message.isUser ? settings.backgroundColor : settings.textColor">

     <!-- הודעת טקסט רגילה -->
     <div *ngIf="message.type === 'text'">
       <div class="message-content">{{ message.text }}</div>
     </div>

     <!-- הודעה עם כפתורים -->
     <div *ngIf="message.type === 'buttons' && message.buttons && message.buttons.length > 0" class="product-buttons">
       <div class="message-content">{{ message.text }}</div>
       <button *ngFor="let btn of message.buttons" 
               (click)="selectedButton(btn)"
               [style.background-color]="settings.secondaryColor"
               [style.color]="settings.textColor"
               class="product-button">
         {{ btn }}
       </button>
     </div>

     <!-- הודעה עם תמונה -->
     <div *ngIf="message.type === 'image' && message.imageUrl">
       <img [src]="message.imageUrl" alt="Image" class="message-image">
       <div *ngIf="message.text" class="message-content">{{ message.text }}</div>
     </div>

     <!-- הודעת כרטיס (Card) -->
     <div *ngIf="message.type === 'card' && message.card" class="message-card">
       <img *ngIf="message.card.imageUrl" [src]="message.card.imageUrl" alt="Card image" class="card-image">
          <div class="card-title">{{ message.card.title }}</div>
          <div *ngIf="message.card.description" class="card-description">{{ message.card.description }}</div>
          <a *ngIf="message.card.buttonText && message.card.buttonUrl"
             [href]="message.card.buttonUrl"
             target="_blank"
             class="card-button">
             {{ message.card.buttonText }}
          </a>
        </div>

      <!-- הודעת בחירה מרובה -->
      <div *ngIf="message.type === 'multi-select'" class="multi-select-container">
        <div class="message-content">{{ message.text }}</div>
        <div class="selected-tags">
          <span *ngFor="let tag of message.selectedOptions" class="tag">
            {{ tag }}
          <button (click)="removeTag(message, tag)">×</button>
          </span>
        </div>
        <div class="multi-select-options">
          <button *ngFor="let option of message.multiSelectOptions"
            (click)="toggleTag(message, option)"
            [class.selected]="message.selectedOptions?.includes(option)">
            {{ option }}
          </button>
        </div>
      </div>

        <!-- אינדיקציה לשליחה -->
        <div *ngIf="message.status === 'sending'" class="sending-indicator">
          <div class="dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <!-- זמן ההודעה -->
        <div class="message-time">{{ formatTime(message.timestamp) }}</div>
      </div>
       </div>
        </div>


      <div class="chat-input-credit">
        <div class="chat-input">
          <div class="chat-input-with-mic">
            <input type="text" 
                   [(ngModel)]="currentMessage" 
                   (keyup.enter)="sendMessage()"
                   [placeholder]="settings.userPlaceholder"
                   [disabled]="isLoading || showProductButtons || conversationEnded || waitingForResponse"
                   [style.font-family]="settings.fontFamily"
                   [style.font-size]="settings.fontSize"
                   class="message-input">
            <button (click)="toggleRecording()"
            [disabled]="isLoading || conversationEnded"
            [style.background-color]="isRecording ? '#dc2626' : 'transparent'"
            class="mic-inside">
              🎙️
            </button>
          </div>
  
          <button (click)="sendMessage()" 
                  [disabled]="isLoading || !currentMessage.trim() || conversationEnded || showProductButtons"
                  [style.background-color]="settings.primaryColor"
                  class="send-button">
            <span *ngIf="!isLoading">➤</span>
            <div *ngIf="isLoading" class="loading-spinner"></div>
          </button>
        </div>
        <div *ngIf="settings.showCredit" class="chat-credit">
          <a [href]="settings.creditUrl" target="_blank" rel="noopener noreferrer">
          {{ settings.creditText }}
          </a>
        </div>
      </div>
      
      
      
      <app-admin></app-admin>
    </div>
  `,
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild(AdminComponent) adminPanel!: AdminComponent;
  
  messages: ChatMessage[] = [];
  currentMessage: string = '';
  settings: ChatSettings = {} as ChatSettings;
  isLoading = false;
  conversationEnded = false;
  waitingForResponse = false;
  showProductButtons = false;
  currentStep: ChatStep = 'collect-details';
  currentPhase: string = 'initial';
  initialQuestionsIndex: number = 0;
  private conversationId: string = '';
  leadData: LeadData = {
    initialAnswers: [],
    questions: []
  };
  threadId: string = '';
  isRecording: boolean = false;
  recognition: any;  // זה יהיה המנוע של זיהוי הדיבור
  isLoadingSettings: boolean = true;

  private settingsSubscription?: Subscription;
  private shouldScrollToBottom = false;

  constructor(
    private settingsService: SettingsService,
    private apiService: ApiService
  ) {
    // Generate unique conversation ID
    this.conversationId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  formatTime(timestamp: Date): string {
    return timestamp.toLocaleTimeString('he-IL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  addBotMessage(message_type:MessageType,text?: string,buttons?: string[],imageUrl?: string,
    card_title?: string,card_description?: string,card_imageUrl?: string,
    card_buttonText?: string,card_buttonUrl?: string, multiSelectOptions?:string[]): void {
    const botMessage: ChatMessage = {
      id: Date.now().toString(),
      text: text,
      isUser: false,
      timestamp: new Date(),
      status: 'sent',
      buttons: (message_type==='buttons'&&buttons) ? buttons.map(button => button) : undefined,
      type: message_type,
      imageUrl: imageUrl,
      card: message_type === 'card' ? { 
        title: card_title || '',
        description: card_description || '',
        imageUrl: card_imageUrl || '',
        buttonText: card_buttonText || '',
        buttonUrl: card_buttonUrl || '',
      } : undefined,
      multiSelectOptions: message_type === 'multi-select' ? multiSelectOptions : undefined,
      selectedOptions: message_type === 'multi-select' ? [] : undefined
    };
    if (message_type === 'buttons' && buttons) {
      this.showProductButtons = true;
    }else {
      this.showProductButtons = false;  
    }
    this.messages.push(botMessage);
    this.shouldScrollToBottom = true;
  }

  ngOnInit(): void {
  // נרשמים ל-settings כדי לעדכן עיצוב וכולי
  this.settingsSubscription = this.settingsService.settings$.subscribe(
    settings => {
      if (settings && Object.keys(settings).length > 0) {
        this.settings = settings;
        this.updateCSSVariables();
      }
    }
  );

  // מריצים את הטעינה וברגע שהיא מסתיימת – מפעילים את ה-chat flow
  this.settingsService.loadSettingsAndNotify().subscribe(() => {
    this.startChatFlow();
  });
}


  ngOnDestroy(): void {
    this.settingsSubscription?.unsubscribe();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  initializeChat(): void {
    // Determine first step based on settings
    this.handleDetailQuestion();
    this.isLoadingSettings = false;
  }

  private updateCSSVariables(): void {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', this.settings.primaryColor);
    root.style.setProperty('--secondary-color', this.settings.secondaryColor);
    root.style.setProperty('--text-color', this.settings.textColor);
    root.style.setProperty('--background-color', this.settings.backgroundColor);
    root.style.setProperty('--font-family', this.settings.fontFamily);
    root.style.setProperty('--font-size', this.settings.fontSize);
  }
toggleRecording(): void {
  if (this.isRecording) {
    this.stopRecording();
  } else {
    this.startRecording();
  }
}
toggleTag(message: ChatMessage, option: string): void {
  if (!message.selectedOptions) {
    message.selectedOptions = [];
  }
  const index = message.selectedOptions.indexOf(option);
  if (index >= 0) {
    message.selectedOptions.splice(index, 1);
  } else {
    message.selectedOptions.push(option);
  }
}

removeTag(message: ChatMessage, tag: string): void {
  const index = message.selectedOptions?.indexOf(tag);
  if (index !== undefined && index >= 0) {
    message.selectedOptions?.splice(index, 1);
  }
}

startRecording(): void {
  try {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('הדפדפן שלך לא תומך בזיהוי דיבור');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'he-IL'; // עברית
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isRecording = true;
    };

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      this.currentMessage = transcript; // שים את הטקסט בתיבת ההקלדה
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      this.isRecording = false;
    };

    this.recognition.onend = () => {
      this.isRecording = false;
    };

    this.recognition.start();
  } catch (error) {
    console.error('Failed to start recording', error);
    this.isRecording = false;
  }
}

stopRecording(): void {
  if (this.recognition) {
    this.recognition.stop();
  }
  this.isRecording = false;
}

  isFormStep(): boolean {
    return ['collect-details'].includes(this.currentStep);
  }

  handleDetailQuestion(): void {
    if(this.initialQuestionsIndex < this.settings.questions.length) {
      let i = this.initialQuestionsIndex;
      this.currentStep = 'collect-details';
      const label = this.settings.questions[i].label.replace(/#([^\s#]+)/g, (match, key) => {
         const found = this.leadData.initialAnswers.find(item => item.key === key);
         return found ? found.value : match;
      });

      this.addBotMessage(this.settings.questions[i].type,
        label,
        this.settings.questions[i].buttons,
        undefined,
        this.settings.questions[i].label,
        this.settings.questions[i].description,
        this.settings.questions[i].imageUrl);
      this.shouldScrollToBottom = true;
    }
    if(this.initialQuestionsIndex===this.settings.questions.length) { 
      this.currentStep = 'ask-question';
      this.addBotMessage('text','מעולה! מה היית רוצה לדעת או לשאול בהתחלה? 💬');
      this.shouldScrollToBottom = true;
    }
  }

  handleDetailSubmit(): void {
    // if (!this.leadData.initialAnswers[].trim()) return;
    if(this.initialQuestionsIndex < this.settings.questions.length) {
      let i = this.initialQuestionsIndex;
      this.currentStep = 'collect-details';
      // const answer = {key:this.settings.questions[i].key,value:this.currentMessage.trim()};
      // this.leadData.initialAnswers.push(answer);
      this.leadData.initialAnswers.push({key:this.settings.questions[i].key,value:this.currentMessage.trim()});
      this.currentMessage = '';
      this.shouldScrollToBottom = true;
      this.initialQuestionsIndex++;
      this.handleDetailQuestion();
    }
    if(this.initialQuestionsIndex===this.settings.questions.length) { 
      this.currentStep = 'ask-question';
    }
  }

  selectedButton(product: string): void {
    this.currentMessage = product;
    this.sendMessage();
    this.showProductButtons = false;
  }

  startChatFlow(): void {
    this.initializeChat();    
  }

  sendMessage(): void {
    if (!this.currentMessage.trim() || this.isLoading ) return;

    if(this.isFormStep()){
       
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        text: this.currentMessage,
        isUser: true,
        timestamp: new Date(),
        status: 'sent',
        type: 'text'
      };

      this.messages.push(userMessage);
      this.shouldScrollToBottom = true;
      if (this.currentStep === 'collect-details') {
        if(this.initialQuestionsIndex==1 && this.currentMessage === this.settings.adminPhone && this.leadData.initialAnswers[0].value === this.settings.adminName) {
          this.openAdminPanel();
          return;
        }
        this.handleDetailSubmit();
      }
      this.currentMessage = '';
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: this.currentMessage,
      isUser: true,
      timestamp: new Date(),
      status: 'sent',
      type: 'text'
    };

    this.messages.push(userMessage);
    this.shouldScrollToBottom = true;

    // if (this.currentStep === 'ask-continue') {
    //   this.handleContinueResponse(this.currentMessage);
    // }
    const messageToSend = this.currentMessage;
    this.currentMessage = '';
    this.isLoading = true;

    // Add temporary loading message
    const loadingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      text: '',
      isUser: false,
      timestamp: new Date(),
      status: 'sending',
      type: 'text'
    };
    this.messages.push(loadingMessage);
    this.shouldScrollToBottom = true;

    // Send to webhook
    this.apiService.sendMessageToWebhook({message:messageToSend , phase:this.currentPhase}, this.threadId, this.conversationId, this.settings.chatWebhookUrl).subscribe({
      next: (response) => {
        this.isLoading = false;
        // Remove loading message
        this.messages = this.messages.filter(msg => msg.id !== loadingMessage.id);

        this.threadId = response.threadId || this.threadId;
        const answer = response.text || response.card.title || 'מצטער, נראה שיש בעיה, אנא נסה שוב בעוד מספר דקות';
        this.currentPhase = response.phase;

        // Save question and answer
        this.leadData.questions.push({
          question: messageToSend,
          answer: answer,
          timestamp: new Date()
        });
        
        this.addBotMessage(response.type || 'text',response.text, response.buttons, response.imageUrl,
          response.card?.title, response.card?.description, response.card?.imageUrl,response.card?.buttonText,response.card?.buttonUrl,response.multiSelectOptions);
        
      },
      error: (error) => {
        this.isLoading = false;
        // Remove loading message
        this.messages = this.messages.filter(msg => msg.id !== loadingMessage.id);
        this.addBotMessage(error.message);
      }
    });
  }

  sendLeadData(): void {
    this.isLoading = true;
    
    const leadDataWithConversation = {
      ...this.leadData,
      conversationId: this.conversationId,
      timestamp: new Date().toISOString(),
      settings: this.settings
    };
    
    this.apiService.submitLeadToWebhook(leadDataWithConversation, this.settings.summaryWebhookUrl).subscribe({
      next: () => {
        this.isLoading = false;
        this.addBotMessage('text','תודה שפנית אלינו! נחזור אליך בהקדם.');
        this.conversationEnded = true;
        this.currentStep = 'completed';
      },
      error: (error) => {
        this.isLoading = false;
        this.addBotMessage('text','תודה שפנית אלינו! נחזור אליך בהקדם.');
        this.conversationEnded = true;
        this.currentStep = 'completed';
      }
    });
  }

  resetChat(): void {
    this.messages = [];
    this.conversationEnded = false;
    this.showProductButtons = false;
    this.waitingForResponse = true;
    this.conversationId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    this.leadData = {
      initialAnswers: [],
      questions: []
    };
    
    this.startChatFlow();
  }

  private scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  minimizeChat(): void {
    window.parent.postMessage({ type: 'closeChat' }, '*');
  }
  
  openAdminPanel(): void {
    // const password = prompt('הזן סיסמת מנהל:');
    // if (password === 'admin123') {
      this.adminPanel.openAdmin();
      this.adminPanel.isAuthenticated = false;
    // } else if (password !== null) {
    //   alert('סיסמה שגויה');
    // }
  }
}