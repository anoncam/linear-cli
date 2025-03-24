# Enhanced Kanban Mode for Linear CLI

This module provides an interactive terminal-based kanban board for viewing and managing Linear issues.

## Features

- **Rich Terminal UI**: Full-featured terminal GUI using neo-blessed library
- **Multi-dimensional Kanban View**: Issues organized by workflow state (columns)
- **Interactive Navigation**: 
  - Arrow keys to navigate between cards and columns
  - Enter key to view issue details
  - Keyboard shortcuts for common actions
- **Issue Detail View**: View all issue metadata (title, description, assignee, etc.)
- **State Management**: Change issue states directly from the terminal
- **Team Switching**: Switch between teams without exiting kanban mode
- **Visual Enhancements**:
  - Color-coded states and priorities
  - Custom styling for better readability
  - Scrollable columns for large datasets

## Controls

- **↑/↓/←/→**: Navigate between issues and columns
- **Enter**: View issue details
- **s**: Change issue state
- **t**: Switch team
- **r**: Refresh data
- **q**: Quit kanban view

## Implementation

The enhanced kanban view is implemented with a modular architecture:

- **Screen**: Main application screen and input handling
- **Layout**: Layout management and component positioning
- **Components**:
  - Board: Main kanban board with columns and cards
  - Header: Application header with team information
  - Footer: Status bar and keyboard shortcuts
  - DetailView: Detailed view of a single issue

## Future Enhancements

As outlined in the enhancement plan, future updates may include:

- Real-time updates via Linear webhooks
- Advanced filtering and search capabilities
- Relationship management (blocking/parent/child issues)
- Data visualization (burndown charts, cycle time)
- Enhanced creation flows for issues and comments

## Usage

The enhanced kanban mode is now the default mode in the Linear CLI. Simply run:

```
linear-cli
```

Or to specify a team:

```
linear-cli kanban TEAM-ID-OR-KEY