import { Component, input } from '@angular/core';

import type { UserTurnView } from '../../../core/media/attachment.types';

@Component({
  selector: 'app-user-turn',
  templateUrl: './user-turn.html',
  styleUrl: './user-turn.scss',
})
export class UserTurnComponent {
  readonly turn = input.required<UserTurnView>();
}
