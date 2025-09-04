export interface ChatMessage {
  id: string;
  type: MessageType; // סוג ההודעה
  text?: string; // טקסט רגיל (לא חובה לכל סוג)
  imageUrl?: string; // לתמונות
  buttons?: string[]; // לכפתורים
  card?: {
    title: string;
    description?: string;
    imageUrl?: string;
    buttonText?: string;
    buttonUrl?: string;
  };
  multiSelectOptions?: string[];
  selectedOptions?: string[];
  isUser: boolean;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

export interface ChatSettings {
  chat_width: string;
  backgroundImageUrl: string;
  webhookUrl: string;
  chatWebhookUrl: string;
  settingsWebhookUrl: string;
  summaryWebhookUrl: string;
  openaiApiKey: string;
  products: string[];
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  backgroundColor: string;
  fontFamily: string;
  fontSize: string;
  welcomeMessage: string;
  chatTitle: string;
  chatIcon: string;
  botName: string;
  userPlaceholder: string;
  // collectName: boolean;
  // collectPhone: boolean;
  // collectProduct: boolean;
  // nameLabel: string;
  // phoneLabel: string;
  // productLabel: string;
  adminName: string;
  adminPhone: string;
  showCredit: boolean;
  creditText: string;
  creditUrl: string;
  questions: QuestionSetting[];
}

export interface LeadData {
  initialAnswers: Answer[];
  questions: Question[];
}

export interface Answer {
  key?: string;
  value: string;
}
export interface Question {
   question: string;
   answer: string;
   timestamp: Date;
}

export type ChatStep = 
  | 'collect-details'
  | 'ask-question'
  | 'completed';

export interface AdminConfig {
  password: string;
}

export type MessageType =
  'text' | 'buttons' | 'image' | 'card'| 'multi-select';



export interface WebhookResponse {
  "תשובה": string;
  "thread_Id_cmd_gen": string;
  "סיום שיחה": string;
}

// settings.model.ts או בקומפוננטה
export interface QuestionSetting {
  type: 'text' | 'buttons' | 'card';
  label: string;
  buttons?: string[];
  buttonsText?: string; // שדה עזר לעבודה עם textarea
  description?: string;
  imageUrl?: string;
  key?: string; // מפתח ייחודי לשימוש פנימי
}

