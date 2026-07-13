import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

interface SamplePrompt {
  readonly icon: string;
  readonly label: string;
  readonly text: string;
}

const SAMPLE_PROMPTS: readonly SamplePrompt[] = [
  {
    icon: 'travel',
    label: 'Plan a weekend',
    text: 'Plan a weekend in Goa for 2 vegetarian travellers leaving Bengaluru on 2026-06-13 and returning 2026-06-15. Suggest flights, a hotel, recommend a few must-do activities, and render the itinerary on a map.',
  },
  {
    icon: 'explore',
    label: 'Activities only',
    text: 'I am already in Goa. Suggest 5 activities for foodies and culture lovers over a 2-day stay.',
  },
  {
    icon: 'compare_arrows',
    label: 'Let me choose',
    text: 'Find flights from Bengaluru to Goa on 2026-06-13 for 1 passenger. Show me the options and let me pick one, then book it for Ankit Sharma and show the trip on a map.',
  },
  {
    icon: 'route',
    label: 'Road trip',
    text: 'Plot a long-weekend road trip from Bengaluru to Coorg via Mysuru and back. Render the route on a map with stops for lunch and a coffee-estate stay.',
  },
];

@Component({
  selector: 'app-sample-prompts',
  imports: [RouterLink, MatButtonModule],
  templateUrl: './sample-prompts.html',
  styleUrl: './sample-prompts.scss',
})
export class SamplePromptsComponent {
  readonly savedCount = input(0);
  readonly select = output<string>();

  protected readonly samplePrompts = SAMPLE_PROMPTS;
}
