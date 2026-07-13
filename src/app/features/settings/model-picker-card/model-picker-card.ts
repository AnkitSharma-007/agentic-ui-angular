import { Component, computed, inject } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

import {
  GeminiService,
  GEMINI_MODELS,
  type GeminiModelId,
} from '../../../core/services/gemini.service';
import { SettingsCardComponent } from '../settings-card/settings-card';

@Component({
  selector: 'app-model-picker-card',
  imports: [SettingsCardComponent, MatFormFieldModule, MatSelectModule, MatIconModule],
  templateUrl: './model-picker-card.html',
  styleUrl: './model-picker-card.scss',
})
export class ModelPickerCardComponent {
  protected readonly gemini = inject(GeminiService);
  protected readonly models = GEMINI_MODELS;

  protected readonly selectedModelMeta = computed(() =>
    this.models.find((m) => m.id === this.gemini.selectedModel()),
  );

  protected selectModel(id: GeminiModelId): void {
    this.gemini.selectModel(id);
  }
}
