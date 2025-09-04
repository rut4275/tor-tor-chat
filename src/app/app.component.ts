import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatComponent } from './components/chat/chat.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ResizableModule } from 'angular-resizable-element'; // ייבוא המודול

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ChatComponent,DragDropModule, ResizableModule],
  template: `
    <div class="app-container">
      <main class="app-main">
        <app-chat></app-chat>
      </main>
    </div>
  `,
  styleUrls: ['./app.component.css']
})
export class AppComponent {
}