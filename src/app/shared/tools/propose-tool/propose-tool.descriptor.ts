import type { ToolDescriptor } from '../../../core/registry/tool-descriptor';
import { customToolDraftSchema } from '../../../core/custom-tools/custom-tool.types';
import { ProposeToolCardComponent } from './propose-tool-card';
import { PROPOSE_TOOL_META } from './propose-tool.manifest';
import type { ProposeToolArgs, ProposeToolResult } from './propose-tool.types';

// Same strict draft contract as the tool builder (identifier names, bounded strings, parameter cap, byte-capped template).
const proposeToolArgsSchema = customToolDraftSchema;

// Defensive stub — interruptive flow resolves via InterruptService before any executor runs.
async function proposeToolExecutor(args: ProposeToolArgs): Promise<ProposeToolResult> {
  return {
    selected: { registered: false, name: args.name, description: args.description },
  };
}

export const proposeToolDescriptor: ToolDescriptor<ProposeToolArgs, ProposeToolResult> = {
  ...PROPOSE_TOOL_META,
  argsSchema: proposeToolArgsSchema,
  component: ProposeToolCardComponent,
  execute: proposeToolExecutor,
};
