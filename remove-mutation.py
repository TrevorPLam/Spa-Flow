with open('.github/workflows/ci.yml', 'r') as f:
    lines = f.readlines()

# Find and remove mutation-tests job (lines 739-783 in 1-indexed, 738-782 in 0-indexed)
# Replace with comment block
new_lines = []
skip_until = None
for i, line in enumerate(lines):
    if line.strip() == 'mutation-tests:':
        # Add comment block instead
        new_lines.append('  # mutation-tests job disabled due to Vitest runner incompatibility (T10 - May 2026)\n')
        new_lines.append('  # Error: "No tests were executed" - Stryker Vitest runner cannot discover tests in sandbox environment\n')
        new_lines.append('  # Configuration preserved in artifacts/api-server/stryker.conf.js for future re-evaluation\n')
        new_lines.append('  # Re-enable when Stryker Vitest runner compatibility improves\n')
        skip_until = 'flakiness-detection:'
    elif skip_until:
        if skip_until in line:
            skip_until = None
            new_lines.append(line)
    else:
        new_lines.append(line)

with open('.github/workflows/ci.yml', 'w') as f:
    f.writelines(new_lines)

print("Done")
