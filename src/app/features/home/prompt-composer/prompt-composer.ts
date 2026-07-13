import { Component, ElementRef, input, model, output, signal, viewChild } from '@angular/core';

import { toDataUrl, type InlineAttachment } from '../../../core/media/attachment.types';
import { isImageFile } from '../../../core/media/image-downscale';

@Component({
  selector: 'app-prompt-composer',
  templateUrl: './prompt-composer.html',
  styleUrl: './prompt-composer.scss',
})
export class PromptComposerComponent {
  readonly prompt = model('');
  readonly attachments = input<readonly InlineAttachment[]>([]);
  readonly notice = input<string | null>(null);
  readonly streaming = input(false);
  readonly canSend = input(false);
  readonly micSupported = input(false);
  readonly recording = input(false);
  readonly sendShortcut = input('Ctrl');

  readonly send = output<void>();
  readonly cancel = output<void>();
  readonly toggleMic = output<void>();
  readonly removeAttachment = output<string>();
  readonly filesAdded = output<readonly File[]>();

  private readonly promptArea = viewChild<ElementRef<HTMLTextAreaElement>>('promptArea');
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly isDraggingOver = signal(false);

  focusInput(): void {
    this.promptArea()?.nativeElement.focus();
  }

  protected openFilePicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  protected onFileInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.filesAdded.emit(Array.from(target.files));
    }
    target.value = '';
  }

  protected onPaste(event: ClipboardEvent): void {
    const files = Array.from(event.clipboardData?.files ?? []);
    if (files.some(isImageFile)) {
      event.preventDefault();
      this.filesAdded.emit(files);
    }
  }

  protected onDragOver(event: DragEvent): void {
    if (this.streaming()) return;
    event.preventDefault();
    this.isDraggingOver.set(true);
  }

  protected onDragLeave(): void {
    this.isDraggingOver.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver.set(false);
    if (this.streaming()) return;
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length > 0) this.filesAdded.emit(files);
  }

  protected preview(attachment: InlineAttachment): string {
    return toDataUrl(attachment);
  }
}
