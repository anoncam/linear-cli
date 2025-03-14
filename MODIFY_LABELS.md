# Linear Label Modification Guide

## Instructions for Claude

This document serves as a guide for analyzing and suggesting improvements to the Linear labels output by the linear-cli tool. You'll be helping to organize, standardize, and optimize the labeling system.

## Analysis Tasks

1. **Categorize and group labels** by purpose (e.g., priority, status, feature area, effort, etc.)
2. **Identify redundant labels** that mean the same thing but have different names
3. **Identify inconsistent naming patterns** across teams
4. **Suggest standardization** of colors, prefixes, and naming conventions
5. **Recommend labels to add** based on common practices
6. **Recommend labels to remove** that are unused or redundant

## Suggested Changes Format

For each recommended change, provide:

```
### Change Type: [Rename | Merge | Add | Remove | Recolor]
- Label(s): [Current label name(s)]
- Team(s): [Team name(s) or "All"]
- Recommendation: [Specific change recommended]
- Rationale: [Why this change would be beneficial]
```

## Example Recommendations

```
### Change Type: Rename
- Label(s): "frontend-issue", "frontend bug", "FE"
- Team(s): Engineering, Product
- Recommendation: Standardize to "frontend" with color #2DA7C7
- Rationale: Creates consistency across teams and aligns with other area labels

### Change Type: Merge
- Label(s): "low priority", "p3", "can wait"
- Team(s): All
- Recommendation: Merge into single "low-priority" label with color #909090
- Rationale: Consolidates redundant priority indicators into a single, clear system

### Change Type: Add
- Label(s): "documentation"
- Team(s): All
- Recommendation: Add label with color #A363D9
- Rationale: Common issue type not currently represented in labeling system

### Change Type: Remove
- Label(s): "old-project-xyz"
- Team(s): Product
- Recommendation: Remove label
- Rationale: Project completed 6+ months ago, no longer relevant
```

## Color Recommendations

* **Priority**: Red (#F87171) for high, Yellow (#FBBF24) for medium, Blue (#60A5FA) for low
* **Status**: Green (#34D399) for active/done, Orange (#F59E0B) for blocked/waiting
* **Type**: Purple (#A78BFA) for bugs, Pink (#F472B6) for features, Grey (#9CA3AF) for chores
* **Area**: Blue tones (#3B82F6, #2563EB, #1D4ED8) for different parts of the product

## Machine-Readable Format for Bulk Changes

After your analysis and recommendations, please include a machine-readable section that can be saved as `label-changes.json` for automated processing. Use this format:

```json
{
  "rename": [
    {
      "id": "label-id-456",       // IMPORTANT: Include the exact label ID from the input data
      "oldName": "frontend-issue",
      "newName": "frontend",
      "teamId": "team-id-123",
      "color": "#2DA7C7"
    }
  ],
  "merge": [
    {
      "sourceLabelIds": ["label-id-123", "label-id-456", "label-id-789"],  // IMPORTANT: Include source label IDs
      "sourceLabels": ["low priority", "p3", "can wait"],
      "targetLabelId": "label-id-target", // If updating an existing label
      "targetLabel": "low-priority",
      "teamId": "team-id-123",
      "color": "#909090"
    }
  ],
  "add": [
    {
      "name": "documentation",
      "teamId": "team-id-123",
      "color": "#A363D9"
    }
  ],
  "remove": [
    {
      "id": "label-id-xyz",       // IMPORTANT: Include the exact label ID from the input data
      "name": "old-project-xyz",
      "teamId": "team-id-123"
    }
  ],
  "recolor": [
    {
      "id": "label-id-bug",       // IMPORTANT: Include the exact label ID from the input data
      "name": "bug",
      "teamId": "team-id-123",
      "color": "#A78BFA"
    }
  ]
}
```

While including the exact label ID from the input data is preferable for precise label identification, the CLI can now match labels by name if IDs aren't provided. This makes it easier to work with Claude's output format.

## Execution Instructions

After reviewing your recommendations, the user can:

1. Save the machine-readable JSON section to a file named `label-changes.json`
2. Execute changes using the Linear CLI tool with:
   ```
   node scripts/linearCli.ts apply-label-changes label-changes.json
   ```
3. Or execute changes through the Linear web interface manually

The CLI will automatically attempt to find label IDs when they are not provided in the JSON file.

## Processing Instructions for Claude

1. Carefully analyze the provided label output
2. Group and categorize the labels
3. Identify patterns, inconsistencies, and redundancies
4. Suggest specific, actionable changes using the human-readable format
5. Consider both team-specific and workspace-wide labels
6. Prioritize changes that would most improve clarity and consistency
7. Provide a machine-readable JSON output at the end that captures all your recommendations
8. IMPORTANT: Always include the exact label ID from the input data for each label you reference in the JSON output
9. For any rename, recolor, or remove operations, copy the exact label ID from the input to your JSON output
10. For merge operations, include all source label IDs in the sourceLabelIds array