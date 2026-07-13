import { z } from 'zod';
import type { ToolDescriptor } from '../../../core/registry/tool-descriptor';
import { abortableSleep } from '../../../core/async/abortable-delay';
import { isKnownAgentId, KNOWN_AGENT_IDS } from '../../../core/agents/agent-definitions';
import { HandoffNoticeComponent } from './handoff-notice';
import { handoffToManifest, HANDOFF_TOOL_NAME } from './handoff-tool.manifest';

const argsSchema = z.object({
  specialist: z.string().min(1),
  reason: z.string().min(1),
});

type HandoffArgs = z.infer<typeof argsSchema>;

interface HandoffSuccess {
  readonly acknowledged: true;
  readonly toAgentId: string;
  readonly reason: string;
}

interface HandoffFailure {
  readonly error: string;
}

type HandoffResult = HandoffSuccess | HandoffFailure;

export const handoffToDescriptor: ToolDescriptor<HandoffArgs, HandoffResult> = {
  name: HANDOFF_TOOL_NAME,
  description: handoffToManifest.description,
  declaration: handoffToManifest.declaration,
  argsSchema,
  component: HandoffNoticeComponent,
  async execute(args) {
    // Unknown specialist would no-op in the registry while the model believes it handed off.
    if (!isKnownAgentId(args.specialist)) {
      const known = [...KNOWN_AGENT_IDS].join(', ');
      return { error: `Unknown specialist "${args.specialist}". Available specialists: ${known}.` };
    }
    await abortableSleep(250);
    return { acknowledged: true, toAgentId: args.specialist, reason: args.reason };
  },
};
