import { Component } from '@angular/core';

import { PageHeaderComponent } from '../../shared/page-header/page-header';
import { ModelPickerCardComponent } from './model-picker-card/model-picker-card';
import { ApiKeyStatusCardComponent } from './api-key-status-card/api-key-status-card';
import { BudgetControlsCardComponent } from './budget-controls-card/budget-controls-card';
import { ToolSynthesisCardComponent } from './tool-synthesis-card/tool-synthesis-card';
import { ThemePickerCardComponent } from './theme-picker-card/theme-picker-card';

@Component({
  selector: 'app-settings',
  imports: [
    PageHeaderComponent,
    ModelPickerCardComponent,
    ApiKeyStatusCardComponent,
    BudgetControlsCardComponent,
    ToolSynthesisCardComponent,
    ThemePickerCardComponent,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class SettingsComponent {}
