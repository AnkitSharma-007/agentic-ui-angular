import type { ToolManifest, ToolMeta } from '../../../core/registry/tool-descriptor';
import type {
  LetUserChooseArgs,
  LetUserChooseResult,
} from './comparison-table.types';

export const LET_USER_CHOOSE_META: ToolMeta = {
  name: 'letUserChoose',
  description:
    'Present a small set of options for the user to pick from. The user is the executor.',
  declaration: {
    name: 'letUserChoose',
    description:
      "Present 2–6 options as a comparison grid for the user to choose between. " +
      'The chosen option (full object) is returned as `{ selected: <option> }`. ' +
      'Pack every field you might need to act on the selection later (ids, ' +
      'prices, currency, route, etc.) into each option\'s `details` so you ' +
      "can avoid re-fetching. Use this when the user has expressed " +
      "ambiguity (e.g. they said 'find me a flight' without picking one) " +
      'rather than guessing on their behalf.',
    parameters: {
      type: 'OBJECT',
      properties: {
        context: {
          type: 'STRING',
          description:
            'One-line summary of what is being compared, e.g. "Flights from Bengaluru to Goa on 2026-06-13".',
        },
        instruction: {
          type: 'STRING',
          description:
            'Optional helper sentence shown above the option grid, e.g. "Pick a flight to book."',
        },
        options: {
          type: 'ARRAY',
          description: 'Between 2 and 6 options to compare.',
          items: {
            type: 'OBJECT',
            description: 'A single comparable option.',
            properties: {
              id: {
                type: 'STRING',
                description:
                  'Stable identifier for this option (e.g. the flight id, hotel id, route slug).',
              },
              title: {
                type: 'STRING',
                description: 'Headline label, e.g. "IndiGo 6E-203, 06:30 → 08:00".',
              },
              subtitle: {
                type: 'STRING',
                description: 'Optional second-line summary, e.g. price or duration.',
              },
              highlight: {
                type: 'STRING',
                description:
                  'Optional one-word badge, e.g. "Cheapest", "Fastest", "Best rated".',
              },
              details: {
                type: 'ARRAY',
                description:
                  'Between 1 and 8 label/value rows shown under the title. Pack every ' +
                  'field you might need to act on the selection (ids, prices, ' +
                  'currency, route, etc.) so you can avoid re-fetching.',
                items: {
                  type: 'OBJECT',
                  description: 'A single label/value row.',
                  properties: {
                    label: {
                      type: 'STRING',
                      description: 'Row label, e.g. "Price" or "Duration".',
                    },
                    value: {
                      type: 'STRING',
                      description: 'Row value as a display string.',
                    },
                  },
                  required: ['label', 'value'],
                },
              },
            },
            required: ['id', 'title', 'details'],
          },
        },
      },
      required: ['context', 'options'],
    },
  },
  interruptive: true,
  interruptReason: 'Pick one of the options to continue.',
};

export const comparisonTableManifest: ToolManifest<
  LetUserChooseArgs,
  LetUserChooseResult
> = {
  ...LET_USER_CHOOSE_META,
  load: () =>
    import('./comparison-table.descriptor').then(
      (m) => m.comparisonTableDescriptor,
    ),
};
