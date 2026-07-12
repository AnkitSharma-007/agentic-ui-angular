import { z } from 'zod';
import type { ToolDescriptor } from '../../../core/registry/tool-descriptor';
import { ComparisonTableComponent } from './comparison-table';
import { LET_USER_CHOOSE_META } from './comparison-table.manifest';
import type {
  LetUserChooseArgs,
  LetUserChooseResult,
} from './comparison-table.types';

// Interactive tool: user's pick arrives via InterruptService.decide(); loop short-circuits with `{ selected }`.

const comparisonDetailSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

const comparisonOptionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  details: z.array(comparisonDetailSchema).min(1).max(8),
  highlight: z.string().optional(),
});

const letUserChooseArgsSchema = z.object({
  context: z.string().min(2),
  instruction: z.string().optional(),
  options: z.array(comparisonOptionSchema).min(2).max(6),
});

async function letUserChooseExecutor(args: LetUserChooseArgs): Promise<LetUserChooseResult> {
  return { selected: args.options[0] };
}

export const comparisonTableDescriptor: ToolDescriptor<
  LetUserChooseArgs,
  LetUserChooseResult
> = {
  ...LET_USER_CHOOSE_META,
  argsSchema: letUserChooseArgsSchema,
  component: ComparisonTableComponent,
  execute: letUserChooseExecutor,
};
