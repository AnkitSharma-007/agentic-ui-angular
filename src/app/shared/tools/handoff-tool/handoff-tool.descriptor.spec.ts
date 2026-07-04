import { describe, expect, it } from 'vitest';
import { handoffToDescriptor } from './handoff-tool.descriptor';

const ctx = { callId: 'c1', signal: new AbortController().signal };

describe('handoffToDescriptor.execute (H2)', () => {
  it('acknowledges a handoff to a known specialist', async () => {
    const result = await handoffToDescriptor.execute(
      { specialist: 'experienceCurator', reason: 'User wants activities.' },
      ctx,
    );
    expect(result).toMatchObject({
      acknowledged: true,
      toAgentId: 'experienceCurator',
      reason: 'User wants activities.',
    });
  });

  it('returns an { error } for an unknown specialist instead of a false success', async () => {
    const result = await handoffToDescriptor.execute(
      { specialist: 'ghostAgent', reason: 'nowhere' },
      ctx,
    );

    expect(result).not.toHaveProperty('acknowledged');
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toMatch(/Unknown specialist/i);
    // Lists the real specialists so the model can self-correct.
    expect((result as { error: string }).error).toMatch(/experienceCurator/);
  });
});
