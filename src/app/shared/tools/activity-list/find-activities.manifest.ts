import type { ToolManifest } from '../../../core/registry/tool-descriptor';

export const FIND_ACTIVITIES_TOOL_NAME = 'findActivities';

export const findActivitiesManifest: ToolManifest = {
  name: FIND_ACTIVITIES_TOOL_NAME,
  description: 'Find activities, attractions, restaurants, and local experiences at a destination.',
  declaration: {
    name: FIND_ACTIVITIES_TOOL_NAME,
    description:
      'Surface activities, attractions, restaurants, and local experiences at a destination, optionally filtered by interest categories.',
    parameters: {
      type: 'OBJECT',
      properties: {
        city: { type: 'STRING', description: 'Destination city, e.g. "Goa" or "Paris".' },
        interests: {
          type: 'ARRAY',
          description:
            'Optional list of interest categories like "food", "culture", "adventure", "beach", "nightlife".',
          items: { type: 'STRING' },
        },
        durationHours: {
          type: 'NUMBER',
          description: 'Approximate total time the user has available, in hours.',
        },
      },
      required: ['city'],
    },
  },
  load: async () => {
    const { findActivitiesDescriptor } = await import('./find-activities.descriptor');
    return findActivitiesDescriptor;
  },
};
