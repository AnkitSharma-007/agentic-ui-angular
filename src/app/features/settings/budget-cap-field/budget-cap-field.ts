import { Component, computed, input, output } from '@angular/core';
import { FormField, type Field } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-budget-cap-field',
  imports: [FormField, MatFormFieldModule, MatInputModule, MatIconModule],
  templateUrl: './budget-cap-field.html',
  styleUrl: './budget-cap-field.scss',
})
export class BudgetCapFieldComponent {
  readonly field = input.required<Field<number | null>>();
  readonly label = input.required<string>();
  readonly icon = input.required<string>();
  readonly step = input.required<string>();
  readonly placeholder = input('');
  readonly hint = input('');
  readonly commit = output<void>();

  protected readonly state = computed(() => this.field()());
}
