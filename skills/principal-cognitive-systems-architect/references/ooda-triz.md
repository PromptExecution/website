# OODA + TRIZ Retry Protocol

Use this loop when a delegated task fails.

## OODA

1. Observe
- Capture exact error signal.
- Capture command, inputs, and environment.

2. Orient
- Compare expected vs actual behavior.
- Identify one likely root cause.

3. Decide
- Choose one smallest corrective action.
- Define a clear validation command.

4. Act
- Apply fix.
- Run validation immediately.

## TRIZ Inversion (Single Pass)

If two OODA cycles fail, run one inversion pass:

1. Reverse a key assumption (e.g., synchronous -> async, eager -> lazy, global -> local).
2. Try one constrained alternative.
3. Validate.

If still failing, escalate with:
- what was tried
- strongest hypothesis
- minimal unblock question

## Stop Rules

Stop retrying when one applies:

1. same failure repeats 3 times.
2. new fix increases blast radius without improving signal.
3. missing external dependency blocks progress.
