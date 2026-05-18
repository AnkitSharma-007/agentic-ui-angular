import type { ToolManifest } from '../../../core/registry/tool-descriptor';

export const HANDOFF_TOOL_NAME = 'handoffTo';

const HANDOFF_DESCRIPTION =
  "Transfer control to a different specialist agent when their domain is a better fit for the user's request.";

export const handoffToManifest: ToolManifest = {
  name: HANDOFF_TOOL_NAME,
  description: HANDOFF_DESCRIPTION,
  declaration: {
    name: HANDOFF_TOOL_NAME,
    description: HANDOFF_DESCRIPTION,
    parameters: {
      type: 'OBJECT',
      properties: {
        specialist: { type: 'STRING', description: 'The id of the specialist agent to hand off to.' },
        reason: { type: 'STRING', description: 'A short, operator-readable reason for the handoff.' },
      },
      required: ['specialist', 'reason'],
    },
  },
  load: async () => {
    const { handoffToDescriptor } = await import('./handoff-tool.descriptor');
    return handoffToDescriptor;
  },
};
