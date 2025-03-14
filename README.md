# Linear CLI

A command-line interface for working with Linear issues across teams, assignees, projects, initiatives, and more for better backlog management, labeling practices, and reporting.

## Features

- Query issues across all teams or specified teams
- Filter by issue creator, assignee, project, initiative, and more
- Command-line interface for direct interaction with Linear API
- Report generation for issue tracking and metrics
- Label management and analysis

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy `.env.example` to `.env` and add your Linear API key:
   ```
   cp .env.example .env
   ```
   Get your API key from [Linear settings](https://linear.app/settings/api):
   - Go to your Linear account settings
   - Navigate to API section
   - Create a personal API key (it should start with `lin_api_`)
   - Copy the key to your `.env` file
4. Install the CLI tool:
   ```
   npm run prepare-cli
   ```

## Development

- Build: `npm run build`
- Run tests: `npm test`
- Lint code: `npm run lint`
- Format code: `npm run format`

## Linear CLI

The CLI provides a way to interact directly with Linear from your terminal and export data in formats suitable for analysis or viewing in tools like Claude.

### Installation

Install the command-line tool:

```
npm run prepare-cli
```

### CLI Usage

```
# List all teams to find your team ID
linear-cli teams

# View issues from a team (can use team ID or team key)
linear-cli issues <team-id-or-key> <timeframe>

# Get team statistics report
linear-cli report <team-id-or-key> <timeframe>

# View all your assigned issues across teams
linear-cli my-issues [timeframe]

# View all issues across teams 
linear-cli all-issues [timeframe]

# Create a new issue interactively
linear-cli create

# View issues in a colorful kanban board (press Ctrl+C to exit)
linear-cli kanban                         # View all issues across teams
linear-cli kanban [team-id-or-key]        # View issues for a specific team

# List all labels in your workspace
linear-cli labels

# List all labels for a specific team
linear-cli team-labels <team-id-or-key>

# Generate a label analysis template for Claude
linear-cli analyze-labels

# List all projects
linear-cli projects

# List workflow states
linear-cli states

# Set default team (so you don't need to specify it each time)
linear-cli set-team <team-id-or-key>

# Set default timeframe (1w, 2w, 1m, 3m)
linear-cli set-timeframe 2w

# Set default output file path
linear-cli set-output <filepath>

# Format and filtering options
linear-cli labels --format json                # Output as JSON instead of markdown
linear-cli issues --output my-issues.md        # Specify output file  
linear-cli all-issues --assignee <user-id>     # Filter by assignee
linear-cli -k                                  # Quick kanban view of ALL issues
linear-cli -k ENG                              # Kanban of ENG team issues
linear-cli issues ENG -k                       # Same as above
linear-cli my-issues -k                        # View your issues in kanban

# Maintenance commands
linear-cli clean                               # Remove all generated files in current directory
```

Key features of the CLI:
- Direct interaction with Linear API - no server needed
- Support for both team IDs and three-letter team keys (e.g., ENG, OPS)
- View issues grouped by team and state
- View your assigned issues across all teams
- Create issues interactively
- Colorful kanban board showing all workflow states with team-specific coloring
- Markdown formatting for Claude integration
- Label analysis with Claude AI and bulk label management
- Report generation with metrics and statistics

The CLI tool fetches data directly from the Linear API and saves it to a file, which you can then view in Claude or analyze directly.

## Label Management Workflow

The Linear CLI provides a complete workflow for analyzing and managing labels with AI assistance:

1. **Analyze team labels**:
   ```
   linear-cli team-labels ENG
   ```
   This creates a file with all labels for the ENG team.

2. **Generate a Claude prompt**:
   The CLI automatically creates an analysis prompt file (ANALYZE_ENG_LABELS.md) that you can upload to Claude.

3. **Get AI recommendations**:
   Upload the file to Claude, which will analyze your labels and suggest improvements.

4. **Apply the changes**:
   Copy the JSON from Claude's response to a file, then run:
   ```
   linear-cli apply-label-changes eng-label-changes.json
   ```
   The tool will automatically find label IDs by name if they aren't provided in the JSON file.

5. **Review the results**:
   The tool will show what changes were made, and you can view the updated labels with:
   ```
   linear-cli team-labels ENG
   ```

This workflow makes it easy to maintain consistent, well-organized labels across your Linear workspace.