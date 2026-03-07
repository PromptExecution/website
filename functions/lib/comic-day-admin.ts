export async function resetComicDay(env: any, day: string) {
  const [comic, workflowRuns, voteCount] = await Promise.all([
    env.DB.prepare('SELECT r2_key_a, r2_key_b FROM comics WHERE day = ?').bind(day).first(),
    env.DB.prepare('SELECT artifact_log_key, image_key_a, image_key_b FROM workflow_runs WHERE day = ?').bind(day).all(),
    env.DB.prepare('SELECT COUNT(*) as total FROM votes WHERE day = ?').bind(day).first(),
  ]);

  const keys = new Set<string>();

  if (comic?.r2_key_a) keys.add(String(comic.r2_key_a));
  if (comic?.r2_key_b) keys.add(String(comic.r2_key_b));

  for (const run of workflowRuns.results || []) {
    if (run.image_key_a) keys.add(String(run.image_key_a));
    if (run.image_key_b) keys.add(String(run.image_key_b));
    if (run.artifact_log_key) {
      const base = String(run.artifact_log_key);
      keys.add(base);
      keys.add(base.replace('workflow-log.json', 'cast.json'));
      keys.add(base.replace('workflow-log.json', 'topics.json'));
      keys.add(base.replace('workflow-log.json', 'prompt-a.txt'));
      keys.add(base.replace('workflow-log.json', 'prompt-b.txt'));
      keys.add(base.replace('workflow-log.json', 'script-a.json'));
      keys.add(base.replace('workflow-log.json', 'script-b.json'));
    }
  }

  if (keys.size > 0) {
    await env.COMICS_BUCKET.delete([...keys]);
  }

  await Promise.all([
    env.DB.prepare('DELETE FROM votes WHERE day = ?').bind(day).run(),
    env.DB.prepare('DELETE FROM comics WHERE day = ?').bind(day).run(),
    env.DB.prepare('DELETE FROM workflow_runs WHERE day = ?').bind(day).run(),
  ]);

  return {
    day,
    deleted: {
      comic: comic ? 1 : 0,
      votes: Number(voteCount?.total || 0),
      workflow_runs: Array.isArray(workflowRuns.results) ? workflowRuns.results.length : 0,
      r2_keys: keys.size,
    },
  };
}
