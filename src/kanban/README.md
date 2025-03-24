# Enhanced Kanban Mode for Linear CLI

This module provides an interactive terminal-based kanban board for viewing and managing Linear issues, including a rich relationship visualization feature.

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
- **Relationship Visualization**:
  - Interactive graph visualization of issue relationships
  - Manage parent/child hierarchies
  - View blocking and blocked by dependencies
  - Add and remove relationships between issues
  - Navigate related issues with a visual graph

## Controls

### Kanban Controls
- **↑/↓/←/→**: Navigate between issues and columns
- **Enter**: View issue details
- **s**: Change issue state
- **t**: Switch team
- **r**: Refresh data
- **q**: Quit kanban view

### Relationship Graph Controls
- **g**: View relationship graph for selected issue
- **d**: View issue details
- **p**: Add parent relationship
- **b**: Add blocking relationship
- **r**: Add related issue relationship
- **Escape**: Return to previous view
- **Enter**: Select related issue

## Implementation

The enhanced kanban view is implemented with a modular architecture:

- **Screen**: Main application screen and input handling
- **Layout**: Layout management and component positioning
- **Components**:
  - Board: Main kanban board with columns and cards
  - Header: Application header with team information
  - Footer: Status bar and keyboard shortcuts
  - DetailView: Detailed view of a single issue
  - RelationshipGraph: Interactive visualization of issue relationships
- **Services**:
  - LinearApiService: GraphQL API integration with Linear
- **State Management**:
  - KanbanState: Central state with event-driven updates
- **Utils**:
  - issueRelations: Utility functions for managing issue relationships
  - dataRefresher: Utilities for refreshing data

## Future Enhancements

Future updates may include:

- Real-time updates via Linear webhooks
- Advanced filtering and search capabilities
- Enhanced relationship visualization with more layouts and navigation options
- Data visualization (burndown charts, cycle time)
- Enhanced creation flows for issues and comments
- Multiple issue selection for batch operations
- Customizable keyboard shortcuts
- Theme support

## Usage

### Kanban View

To launch the enhanced kanban board:

```
linear-cli kanban
```

Or to specify a team:

```
linear-cli kanban TEAM-ID-OR-KEY
```

You can also use the shorthand `-k` flag:

```
linear-cli -k TEAM-ID-OR-KEY
```

### Relationship Visualization

To launch the relationship visualization:

```
linear-cli relationships
```

Or to specify a team:

```
linear-cli relationships TEAM-ID-OR-KEY
```

You can also use the shorthand `-r` flag:

```
linear-cli -r TEAM-ID-OR-KEY
```