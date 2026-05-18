import { z } from 'zod';
import type { ToolDescriptor } from '../../../core/registry/tool-descriptor';
import { HandoffNoticeComponent } from './handoff-notice';
import { handoffToManifest, HANDOFF_TOOL_NAME } from './handoff-tool.manifest';

const argsSchema = z.object({
  specialist: z.string().min(1),
  reason: z.string().min(1),
});

type HandoffArgs = z.infer<typeof argsSchema>;

interface HandoffResult {
  readonly acknowledged: true;
  readonly toAgentId: string;
  readonly reason: string;
}

export const handoffToDescriptor: ToolDescriptor<HandoffArgs, HandoffResult> = {
  name: HANDOFF_TOOL_NAME,
  description: handoffToManifest.description,
  declaration: handoffToManifest.declaration,
  argsSchema,
  component: HandoffNoticeComponent,
  async execute(args) {
    await new Promise((r) => setTimeout(r, 250));
    return { acknowledged: true, toAgentId: args.specialist, reason: args.reason };
  },
};
