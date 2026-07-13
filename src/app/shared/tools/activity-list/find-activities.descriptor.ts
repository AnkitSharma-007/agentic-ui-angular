import { z } from 'zod';
import type { ToolDescriptor } from '../../../core/registry/tool-descriptor';
import { abortableSleep } from '../../../core/async/abortable-delay';
import { ActivityListComponent } from './activity-list';
import { findActivitiesManifest, FIND_ACTIVITIES_TOOL_NAME } from './find-activities.manifest';

const argsSchema = z.object({
  city: z.string().min(1),
  interests: z.array(z.string()).optional(),
  durationHours: z.number().positive().optional(),
});

type FindActivitiesArgs = z.infer<typeof argsSchema>;

interface FindActivitiesResult {
  readonly city: string;
  readonly activities: readonly Activity[];
  readonly totalDurationHours: number;
}

export type ActivityCategory =
  | 'food'
  | 'culture'
  | 'adventure'
  | 'beach'
  | 'nightlife'
  | 'shopping'
  | 'nature'
  | 'wellness';

export interface Activity {
  readonly name: string;
  readonly category: ActivityCategory;
  readonly description: string;
  readonly durationHours: number;
  readonly priceRange: string;
  readonly rating: number;
  readonly bestTime: string;
  readonly highlight: boolean;
}

const ACTIVITY_LIBRARY: Readonly<Record<string, readonly Activity[]>> = {
  goa: [
    {
      name: 'Sunset cruise on the Mandovi',
      category: 'adventure',
      description:
        'A 90-minute river cruise with live music, complimentary drinks, and the best photo light of the day.',
      durationHours: 1.5,
      priceRange: '₹600/person',
      rating: 4.7,
      bestTime: 'Evening (5–7 PM)',
      highlight: true,
    },
    {
      name: 'Anjuna flea market wander',
      category: 'shopping',
      description:
        'Wednesday-only market with handcrafted jewellery, leather, and clothes. Bargain politely.',
      durationHours: 2.5,
      priceRange: '₹500–2,000',
      rating: 4.3,
      bestTime: 'Wed morning',
      highlight: false,
    },
    {
      name: 'Dinner at Thalassa (Vagator)',
      category: 'food',
      description:
        'Cliff-top Greek taverna with live music, ouzo on tap, and lamb gyros worth the wait.',
      durationHours: 2,
      priceRange: '₹2,500/couple',
      rating: 4.6,
      bestTime: 'Reserve before 7 PM',
      highlight: true,
    },
    {
      name: 'Dudhsagar Falls day trip',
      category: 'nature',
      description:
        'Four-tier waterfall in the Bhagwan Mahavir sanctuary. Hire a jeep from Mollem; expect to get wet.',
      durationHours: 6,
      priceRange: '₹3,000 incl. jeep',
      rating: 4.8,
      bestTime: 'Post-monsoon (Aug–Oct)',
      highlight: true,
    },
    {
      name: 'Old Goa church circuit',
      category: 'culture',
      description:
        'Basilica of Bom Jesus + Sé Cathedral. Free entry, ~45 min per site, very Instagrammable.',
      durationHours: 2,
      priceRange: 'Free',
      rating: 4.4,
      bestTime: 'Morning to skip heat',
      highlight: false,
    },
    {
      name: 'Yoga + breakfast at Bean Me Up',
      category: 'wellness',
      description:
        'Anjuna café with daily ashtanga at 8 AM, then a long vegan brunch on the garden patio.',
      durationHours: 2.5,
      priceRange: '₹1,200 incl. brunch',
      rating: 4.5,
      bestTime: 'Mornings',
      highlight: false,
    },
  ],
  paris: [
    {
      name: 'Louvre: focused 2-hour route',
      category: 'culture',
      description:
        "Skip-the-line ticket, then the Mona Lisa, Winged Victory, and Egyptian wing. Don't try to see everything.",
      durationHours: 2,
      priceRange: '€22',
      rating: 4.6,
      bestTime: 'Wed/Fri evenings (open late)',
      highlight: true,
    },
    {
      name: 'Marais walking tour',
      category: 'culture',
      description:
        'Falafel at L\'As du Fallafel, then Place des Vosges, then the Picasso museum. Park hop the whole way.',
      durationHours: 3,
      priceRange: '€15 lunch + €14 museum',
      rating: 4.4,
      bestTime: 'Saturdays',
      highlight: false,
    },
    {
      name: 'Eiffel Tower sunrise climb',
      category: 'adventure',
      description:
        '700-step climb to the second floor. Beats elevator queues and the light is exquisite.',
      durationHours: 1.5,
      priceRange: '€11 (stairs)',
      rating: 4.7,
      bestTime: 'First slot of the day',
      highlight: true,
    },
    {
      name: 'Le Comptoir bistro dinner',
      category: 'food',
      description:
        'Classic Saint-Germain bistro by Yves Camdeborde. Tasting menu only at dinner. Book a month out.',
      durationHours: 2.5,
      priceRange: '€85/person',
      rating: 4.8,
      bestTime: '8 PM seating',
      highlight: true,
    },
  ],
  tokyo: [
    {
      name: 'Tsukiji outer market food crawl',
      category: 'food',
      description:
        'Tamagoyaki, uni shooters, A5 wagyu skewers. Go early. Most stalls close by noon.',
      durationHours: 2.5,
      priceRange: '¥3,000–5,000',
      rating: 4.7,
      bestTime: 'Mornings 7–10 AM',
      highlight: true,
    },
    {
      name: 'TeamLab Planets immersive',
      category: 'culture',
      description:
        'Barefoot art installation in Toyosu. 90 mins, all sensory. Pre-book the earliest slot.',
      durationHours: 1.5,
      priceRange: '¥3,800',
      rating: 4.6,
      bestTime: 'Off-peak hours',
      highlight: true,
    },
    {
      name: 'Golden Gai bar hop',
      category: 'nightlife',
      description:
        'Six narrow streets of 6-seat bars in Shinjuku. ¥1,000 cover at most spots, very specific vibes per door.',
      durationHours: 3,
      priceRange: '¥5,000–8,000',
      rating: 4.5,
      bestTime: '9 PM onwards',
      highlight: false,
    },
  ],
};

function generateFallbackActivities(city: string): readonly Activity[] {
  return [
    {
      name: `Walking tour of central ${city}`,
      category: 'culture',
      description:
        'Self-guided loop covering the main square, historic buildings, and best photo spots.',
      durationHours: 2,
      priceRange: 'Free',
      rating: 4.3,
      bestTime: 'Mid-morning',
      highlight: true,
    },
    {
      name: `Local food market visit`,
      category: 'food',
      description: 'Sample street food and pick up local snacks for the road.',
      durationHours: 1.5,
      priceRange: 'Budget-friendly',
      rating: 4.4,
      bestTime: 'Mornings',
      highlight: false,
    },
    {
      name: `Sunset viewpoint`,
      category: 'nature',
      description: 'A short walk to the best sunset spot. Bring a jacket, it gets windy.',
      durationHours: 1,
      priceRange: 'Free',
      rating: 4.6,
      bestTime: 'Just before sundown',
      highlight: true,
    },
    {
      name: `Regional cooking class`,
      category: 'food',
      description: 'Three-hour hands-on session with a local chef. Lunch included.',
      durationHours: 3,
      priceRange: '$$',
      rating: 4.5,
      bestTime: 'Afternoons',
      highlight: false,
    },
    {
      name: `Spa & wellness afternoon`,
      category: 'wellness',
      description: 'Local hammam or spa with a 60-minute massage and steam.',
      durationHours: 2,
      priceRange: '$$$',
      rating: 4.4,
      bestTime: 'Late afternoon',
      highlight: false,
    },
  ];
}

export const findActivitiesDescriptor: ToolDescriptor<
  FindActivitiesArgs,
  FindActivitiesResult
> = {
  name: FIND_ACTIVITIES_TOOL_NAME,
  description: findActivitiesManifest.description,
  declaration: findActivitiesManifest.declaration,
  argsSchema,
  component: ActivityListComponent,
  async execute(args) {
    await simulatedSearchLatency();

    const cityKey = args.city.trim().toLowerCase();
    const library = ACTIVITY_LIBRARY[cityKey] ?? generateFallbackActivities(args.city);

    const activities = trimToDuration(
      filterByInterests(library, args.interests),
      args.durationHours,
    );

    return {
      city: args.city,
      activities: activities.map((a) => ({ ...a })),
      totalDurationHours: activities.reduce((sum, a) => sum + a.durationHours, 0),
    };
  },
};

function simulatedSearchLatency(): Promise<void> {
  return abortableSleep(900 + Math.random() * 600);
}

function filterByInterests(
  library: readonly Activity[],
  interests: readonly string[] | undefined,
): readonly Activity[] {
  if (!interests?.length) return library;
  const wanted = new Set(interests.map((s) => s.toLowerCase()));
  const filtered = library.filter((a) => wanted.has(a.category));
  return filtered.length > 0 ? filtered : library;
}

function trimToDuration(
  activities: readonly Activity[],
  budget: number | undefined,
): readonly Activity[] {
  if (!budget || budget <= 0) return activities;
  const fit: Activity[] = [];
  let remaining = budget;
  for (const a of activities) {
    if (a.durationHours <= remaining) {
      fit.push(a);
      remaining -= a.durationHours;
    }
  }
  return fit.length > 0 ? fit : activities;
}
