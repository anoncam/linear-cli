# Linear CLI

A comprehensive command-line interface for working with Linear issues across teams, assignees, projects, initiatives, and more. This tool enables better backlog management, consistent labeling practices, and enhanced reporting through direct integration with Linear's GraphQL API.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- **Cross-Team Queries**: Fetch and analyze issues across multiple teams
- **Interactive UI**: Colorful terminal-based kanban board visualization
- **Flexible Filtering**: Filter by creator, assignee, project, initiative, and more
- **Label Management**: AI-assisted label organization with Claude integration
- **Report Generation**: Create comprehensive markdown reports for analysis
- **Direct API Integration**: No server component needed - call Linear's GraphQL API directly
- **User-Friendly**: Uses team keys (e.g., "ENG") instead of requiring UUIDs
- **Configuration**: Save preferences for faster workflows

## Table of Contents

- [Setup](#setup)
- [CLI Command Reference](#cli-command-reference)
- [Advanced Features](#advanced-features)
  - [Kanban Visualization](#kanban-visualization)
  - [Label Management Workflow](#label-management-workflow)
  - [Report Generation](#report-generation)
- [Architecture](#architecture)
- [Extending the CLI](#extending-the-cli)
- [Contributing](#contributing)
- [License](#license)

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/anoncam/linear-cli.git
   cd linear-cli
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure your Linear API key**
   
   Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
   
   Then get your API key from [Linear settings](https://linear.app/settings/api):
   - Go to your Linear account settings
   - Navigate to API section
   - Create a personal API key (it should start with `lin_api_`)
   - Add it to your `.env` file:
     ```
     LINEAR_API_KEY=lin_api_your_key_here
     ```

4. **Install the CLI tool**
   ```bash
   npm run prepare-cli
   ```

## CLI Command Reference

### Core Commands

```bash
# Teams and Users
linear-cli teams                           # List all teams with IDs and keys
linear-cli viewer                          # Show current user info

# Issue Management
linear-cli issues <team-id-or-key> [time]  # View issues for a team
linear-cli my-issues [timeframe]           # View your assigned issues
linear-cli all-issues [timeframe]          # View issues across all teams
linear-cli create                          # Create a new issue interactively

# Visualization
linear-cli kanban                          # View all issues in kanban board
linear-cli kanban <team-id-or-key>         # View team issues in kanban
linear-cli -k                              # Shorthand for kanban view

# Label Management
linear-cli labels                          # List all labels in workspace
linear-cli team-labels <team-id-or-key>    # List team-specific labels
linear-cli analyze-labels                  # Generate label analysis template for Claude
linear-cli apply-label-changes <json-file> # Apply label changes from JSON

# Data & Reports
linear-cli report <team-id-or-key> [time]  # Generate team report
linear-cli projects                        # List all projects
linear-cli states                          # List workflow states
linear-cli clean                           # Remove generated files
```

### Configuration Options

```bash
# Set defaults to streamline your workflow
linear-cli set-team <team-id-or-key>       # Set default team 
linear-cli set-timeframe <1w|2w|1m|3m>     # Set default time period
linear-cli set-output <filepath>           # Set default output file path
linear-cli config                          # Show current configuration
```

### Format & Output Options

```bash
# Formatting and output options (can be used with most commands)
--format json                              # Output as JSON instead of markdown
--output <filename>                        # Specify output file
--assignee <user-id>                       # Filter by assignee
-k, --kanban                               # Show in kanban view
```

## Advanced Features

### Kanban Visualization

The CLI provides a colorful terminal-based kanban board for visualizing issues:

```bash
linear-cli kanban ENG
```

![Kanban Board Example](https://example.com/kanban-screenshot.png)

Key features:
- Color-coded workflow states
- Team-specific coloring
- Assignee and priority information
- Live terminal view

### Label Management Workflow

The CLI offers an AI-powered label management workflow:

1. **Export Current Labels**: Get your team's current labels
   ```bash
   linear-cli team-labels ENG
   ```

2. **AI Analysis**: The CLI automatically creates an analysis prompt file (`ANALYZE_ENG_LABELS.md`) - upload this to Claude.

3. **Get Recommendations**: Claude will analyze and suggest improvements like:
   - Standardizing naming conventions
   - Consolidating redundant labels
   - Organizing by color scheme
   - Removing unused labels

4. **Apply Changes**: Save Claude's JSON output and apply changes:
   ```bash
   linear-cli apply-label-changes eng-label-changes.json
   ```
   
   The tool automatically:
   - Resolves label IDs from names when not provided
   - Handles create, update, delete operations
   - Reports success/failure for each operation
   - Confirms all changes before proceeding

5. **Verification**: Review the updated labels
   ```bash
   linear-cli team-labels ENG
   ```

### Report Generation

Generate comprehensive reports for teams:

```bash
linear-cli report ENG 2w
```

Reports include:
- Issue counts by state
- Label usage statistics
- Assignee distribution
- Completed/canceled issue metrics
- Timeframe analysis

Use `--output` to save to a specific file:

```bash
linear-cli report ENG 2w --output eng-sprint-report.md
```

## Architecture

The Linear CLI is built with the following architecture:

- **TypeScript**: Type-safe implementation
- **GraphQL Client**: Direct integration with Linear's GraphQL API
- **Commander**: Command-line parsing and help documentation
- **Chalk**: Terminal coloring for improved UX
- **Configuration Store**: Local config for persistent settings

```
linear-cli/
├── scripts/         # Main CLI implementation
│   └── linearCli.ts # Entry point with commands
├── src/
│   ├── api/         # API route definitions
│   ├── services/    # Linear API client
│   ├── types/       # TypeScript type definitions
│   └── utils/       # Utility functions
├── .env             # Environment configuration
└── tsconfig.json    # TypeScript configuration
```

### Key Components

1. **GraphQL Client**: Direct integration with Linear API
2. **Command Parser**: Processes command-line arguments
3. **Configuration Manager**: Saves user preferences
4. **API Services**: Functions to fetch and transform data
5. **Output Formatters**: Format data as JSON, markdown, or terminal display
6. **Label Management Engine**: Handles label CRUD operations

## Extending the CLI

The Linear CLI is designed to be easily extended. Here are some ways to add functionality:

### Adding New Commands

1. Locate the command handling section in `scripts/linearCli.ts`
2. Add your new command case following the pattern of existing commands
3. Implement your command's functionality, using the GraphQL client for API access

Example structure for adding a new command:

```typescript
// Add your GraphQL query for the new feature
const getCustomData = async () => {
  const query = `
    query GetCustomData {
      // your GraphQL query here
    }
  `;
  
  const data = await executeGraphQLQuery(query);
  return data.yourDataProperty;
};

// In the main command handler
if (command === 'your-new-command') {
  try {
    const data = await getCustomData();
    // Process and display the data
    console.log('Your new command output:', data);
  } catch (error) {
    console.error('Error in your new command:', error);
  }
}
```

### Adding GraphQL Queries

1. Review the Linear API documentation at [developers.linear.app](https://developers.linear.app/docs/graphql/working-with-the-graphql-api)
2. Add your new query to the appropriate section in `scripts/linearCli.ts`
3. Create corresponding TypeScript types in `src/types/linear.ts`

### Enhancing Output Formats

The CLI currently supports JSON and Markdown output formats. To add a new format:

1. Add a new format option in the command line arguments section
2. Implement a formatter function for your new format
3. Update the output handling to use your formatter when selected

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.