import { Component, inject } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { MAX_TOOL_SYNTHESIS_PER_TURN } from '../../../core/services/agent-loop';
import { ToolSynthesisSettings } from '../../../core/settings/tool-synthesis.settings';
import { SettingsCardComponent } from '../settings-card/settings-card';

@Component({
  selector: 'app-tool-synthesis-card',
  imports: [SettingsCardComponent, MatSlideToggleModule],
  templateUrl: './tool-synthesis-card.html',
  styleUrl: './tool-synthesis-card.scss',
})
export class ToolSynthesisCardComponent {
  protected readonly toolSynthesis = inject(ToolSynthesisSettings);
  protected readonly maxToolSynthesisPerTurn = MAX_TOOL_SYNTHESIS_PER_TURN;

  protected setToolSynthesis(enabled: boolean): void {
    this.toolSynthesis.setEnabled(enabled);
  }
}
