/**
 * Board Component
 * 
 * This component sets up the main kanban board with columns for each workflow state.
 */

import blessed from 'neo-blessed';
import { KanbanState, FilterDimension, ViewMode } from '../state/kanbanState';
import { LinearIssue, LinearState, LinearUser } from '../../types/linear';

// Define colors for priority levels
const PRIORITY_COLORS = {
  0: 'red', // Urgent
  1: 'yellow', // High
  2: 'green', // Medium
  3: 'blue', // Low
  4: 'gray', // No priority
};

// Define colors for state types
const STATE_TYPE_COLORS = {
  backlog: 'gray',
  unstarted: 'blue',
  started: 'yellow',
  completed: 'green',
  canceled: 'red',
};

/**
 * Set up the main kanban board
 */
export function setupBoard(
  boardBox: ReturnType<typeof blessed.box>,
  state: KanbanState
): void {
  // Create a container for the columns
  const columnsContainer = blessed.box({
    parent: boardBox,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    style: {
      fg: 'white',
      bg: 'black',
    },
  });

  // Keep track of the columns and issue elements
  let columns: ReturnType<typeof blessed.box>[] = [];
  let issueElements: Record<string, ReturnType<typeof blessed.box>> = {};

  // Function to render the board based on the current filter dimension
  function renderBoard() {
    // Clear existing columns and issue elements
    columns.forEach((column) => column.destroy());
    columns = [];
    issueElements = {};

    // Skip rendering if there are no issues
    if (state.issues.length === 0) {
      const noIssuesBox = blessed.box({
        parent: columnsContainer,
        top: 'center',
        left: 'center',
        width: '50%',
        height: 3,
        content: 'No issues found with the current filters',
        align: 'center',
        valign: 'middle',
        style: {
          fg: 'white',
          bg: 'black',
          border: {
            fg: 'white',
          },
        },
        border: {
          type: 'line',
        },
      });
      
      boardBox.screen!.render();
      return;
    }

    // Group issues based on the current filter dimension
    const groupedIssues = groupIssuesByDimension(state.issues, state.filterDimension);
    
    // Calculate column width based on the number of groups
    const columnWidth = Math.floor((boardBox as any).width / Object.keys(groupedIssues).length);
    
    // Create columns for each group
    let columnIndex = 0;
    for (const [groupKey, groupInfo] of Object.entries(groupedIssues)) {
      const columnLeft = columnIndex * columnWidth;
      
      // Create the column
      const column = blessed.box({
        top: 0,
        left: columnLeft,
        width: columnWidth,
        bottom: 0,
        scrollable: true,
        scrollbar: {
          ch: ' ',
          track: {
            bg: 'gray',
          },
        },
        style: {
          fg: 'white',
          bg: 'black',
          border: {
            fg: columnIndex === state.focusedColumnIndex ? 'white' : 'blue',
          },
        },
        border: {
          type: 'line',
        },
        mouse: true,
        keys: true,
      });
      
      columnsContainer.append(column);
      
      columns.push(column);
      
      // Create the column header
      const headerBg = getColumnHeaderColor(groupKey, state.filterDimension);
      const isFocusedColumn = columnIndex === state.focusedColumnIndex;
      
      const header = blessed.box({
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        content: `${groupInfo.name} (${groupInfo.issues.length})`,
        align: 'center',
        valign: 'middle',
        style: {
          fg: isFocusedColumn ? 'black' : 'white',
          bg: isFocusedColumn ? 'white' : headerBg,
        },
      });
      column.append(header);
      
      // Add empty column indicator if there are no issues
      if (groupInfo.issues.length === 0 && isFocusedColumn) {
        const indicator = blessed.box({
          top: 'center',
          left: 'center',
          width: '80%',
          height: 3,
          content: '[Currently focused]',
          align: 'center',
          valign: 'middle',
          style: {
            fg: 'black',
            bg: 'white',
            border: {
              fg: 'white',
            },
          },
          border: {
            type: 'line',
          },
        });
        column.append(indicator);
      }
      
      // Create issue cards for each issue in the group
      let cardIndex = 0;
      for (const issue of groupInfo.issues) {
        const card = createIssueCard(issue, column, cardIndex, state.filterDimension, columnIndex);
        issueElements[issue.id] = card;
        cardIndex++;
      }
      
      columnIndex++;
    }
    
    // Set initial focus if needed
    if (state.focusedColumnIndex >= columns.length) {
      state.setFocusedColumn(0);
    }
    
    // Render the screen
    boardBox.screen!.render();
  }

  // Function to create an issue card
  function createIssueCard(
    issue: LinearIssue,
    column: ReturnType<typeof blessed.box>,
    index: number,
    filterDimension: FilterDimension,
    colIndex: number
  ): ReturnType<typeof blessed.box> {
    const cardHeight = 5;
    const cardTop = 3 + (index * (cardHeight + 1));
    
    // Determine card color based on priority
    const priorityColor = PRIORITY_COLORS[issue.priority as keyof typeof PRIORITY_COLORS] || 'gray';
    
    // Check if this is the focused card based on column and issue indices
    const isFocused = colIndex === state.focusedColumnIndex && index === state.focusedIssueIndex;
    
    // Create the card
    const card = blessed.box({
      top: cardTop,
      left: 1,
      right: 1,
      height: cardHeight,
      style: {
        fg: isFocused ? 'black' : 'white',
        bg: isFocused ? 'white' : 'black',
        border: {
          fg: isFocused ? 'white' : priorityColor,
        },
        focus: {
          border: {
            fg: 'white',
          },
        },
      },
      border: {
        type: 'line',
      },
      mouse: true,
      keys: true,
      tags: true,
    });
    
    column.append(card);
    
    // Add issue identifier and title
    const titleText = blessed.text({
      top: 0,
      left: 1,
      content: `${issue.identifier}: ${truncateText(issue.title, column.width! - 10)}`,
      style: {
        fg: 'white',
      },
    });
    card.append(titleText);
    
    // Add assignee info
    const assigneeText = blessed.text({
      top: 1,
      left: 1,
      content: `Assignee: ${issue.assignee ? issue.assignee.name : 'Unassigned'}`,
      style: {
        fg: 'white',
      },
    });
    card.append(assigneeText);
    
    // Add additional info based on filter dimension
    if (filterDimension === FilterDimension.STATE) {
      // If grouped by state, show priority and labels
      const priorityText = blessed.text({
        top: 2,
        left: 1,
        content: `Priority: P${issue.priority}`,
        style: {
          fg: priorityColor,
        },
      });
      card.append(priorityText);
      
      // Show labels if any
      if (issue.labels && issue.labels.length > 0) {
        const labelText = issue.labels
          .slice(0, 3)
          .map((label) => `{${label.color}-fg}${label.name}{/}`)
          .join(', ');
        
        const labelsText = blessed.text({
          top: 3,
          left: 1,
          content: `Labels: ${labelText}`,
          tags: true,
          style: {
            fg: 'white',
          },
        });
        card.append(labelsText);
      }
    } else if (filterDimension === FilterDimension.ASSIGNEE) {
      // If grouped by assignee, show state and priority
      const stateText = blessed.text({
        top: 2,
        left: 1,
        content: `State: ${issue.state.name}`,
        style: {
          fg: getStateColor(issue.state),
        },
      });
      card.append(stateText);
      
      const priorityText = blessed.text({
        top: 3,
        left: 1,
        content: `Priority: P${issue.priority}`,
        style: {
          fg: priorityColor,
        },
      });
      card.append(priorityText);
    } else if (filterDimension === FilterDimension.PRIORITY) {
      // If grouped by priority, show state and assignee
      const stateText = blessed.text({
        top: 2,
        left: 1,
        content: `State: ${issue.state.name}`,
        style: {
          fg: getStateColor(issue.state),
        },
      });
      card.append(stateText);
      
      // Show labels if any
      if (issue.labels && issue.labels.length > 0) {
        const labelText = issue.labels
          .slice(0, 3)
          .map((label) => `{${label.color}-fg}${label.name}{/}`)
          .join(', ');
        
        const labelsText = blessed.text({
          top: 3,
          left: 1,
          content: `Labels: ${labelText}`,
          tags: true,
          style: {
            fg: 'white',
          },
        });
        card.append(labelsText);
      }
    } else if (filterDimension === FilterDimension.LABEL) {
      // If grouped by label, show state and priority
      const stateText = blessed.text({
        top: 2,
        left: 1,
        content: `State: ${issue.state.name}`,
        style: {
          fg: getStateColor(issue.state),
        },
      });
      card.append(stateText);
      
      const priorityText = blessed.text({
        top: 3,
        left: 1,
        content: `Priority: P${issue.priority}`,
        style: {
          fg: priorityColor,
        },
      });
      card.append(priorityText);
    }
    
    // Handle card selection
    card.on('click', () => {
      state.setSelectedIssue(issue.id);
      state.setViewMode(ViewMode.DETAIL);
    });
    
    return card;
  }

  // Function to group issues by the current filter dimension
  function groupIssuesByDimension(
    issues: LinearIssue[],
    dimension: FilterDimension
  ): Record<string, { name: string; issues: LinearIssue[] }> {
    const groups: Record<string, { name: string; issues: LinearIssue[] }> = {};
    
    if (dimension === FilterDimension.STATE) {
      // Group by workflow state
      const stateMap = new Map<string, LinearState>();
      state.workflowStates.forEach((s) => stateMap.set(s.id, s));
      
      // Pre-create groups for all workflow states to maintain order
      state.workflowStates
        .sort((a, b) => (a as any).position - (b as any).position)
        .forEach((s) => {
          groups[s.id] = { name: s.name, issues: [] };
        });
      
      // Add issues to their respective groups
      issues.forEach((issue) => {
        const stateId = issue.state.id;
        if (!groups[stateId]) {
          groups[stateId] = { name: issue.state.name, issues: [] };
        }
        groups[stateId].issues.push(issue);
      });
    } else if (dimension === FilterDimension.ASSIGNEE) {
      // Group by assignee
      const userMap = new Map<string, LinearUser>();
      state.users.forEach((u) => userMap.set(u.id, u));
      
      // Create a group for unassigned issues
      groups['unassigned'] = { name: 'Unassigned', issues: [] };
      
      // Add issues to their respective groups
      issues.forEach((issue) => {
        const assigneeId = issue.assignee?.id || 'unassigned';
        const assigneeName = issue.assignee?.name || 'Unassigned';
        
        if (!groups[assigneeId]) {
          groups[assigneeId] = { name: assigneeName, issues: [] };
        }
        groups[assigneeId].issues.push(issue);
      });
    } else if (dimension === FilterDimension.PRIORITY) {
      // Group by priority
      const priorityNames = {
        0: 'Urgent',
        1: 'High',
        2: 'Medium',
        3: 'Low',
        4: 'No Priority',
      };
      
      // Pre-create groups for all priorities to maintain order
      [0, 1, 2, 3, 4].forEach((p) => {
        groups[p.toString()] = { 
          name: priorityNames[p as keyof typeof priorityNames], 
          issues: [] 
        };
      });
      
      // Add issues to their respective groups
      issues.forEach((issue) => {
        const priority = issue.priority !== null ? issue.priority.toString() : '4';
        groups[priority].issues.push(issue);
      });
    } else if (dimension === FilterDimension.LABEL) {
      // Group by label
      // Create a group for issues with no labels
      groups['no-label'] = { name: 'No Labels', issues: [] };
      
      // Add issues to their respective groups
      issues.forEach((issue) => {
        if (!issue.labels || issue.labels.length === 0) {
          groups['no-label'].issues.push(issue);
        } else {
          // Add the issue to each of its label groups
          issue.labels.forEach((label) => {
            if (!groups[label.id]) {
              groups[label.id] = { name: label.name, issues: [] };
            }
            groups[label.id].issues.push(issue);
          });
        }
      });
    }
    
    return groups;
  }

  // Helper function to get the color for a state
  function getStateColor(stateObj: LinearState): string {
    if ((stateObj as any).color) {
      return (stateObj as any).color;
    }
    return STATE_TYPE_COLORS[stateObj.type as keyof typeof STATE_TYPE_COLORS] || 'white';
  }

  // Helper function to get the color for a column header
  function getColumnHeaderColor(groupKey: string, dimension: FilterDimension): string {
    if (dimension === FilterDimension.STATE) {
      const stateObj = state.workflowStates.find((s: any) => s.id === groupKey);
      if (stateObj) {
        if (stateObj.type === 'backlog') return 'gray';
        if (stateObj.type === 'unstarted') return 'blue';
        if (stateObj.type === 'started') return 'yellow';
        if (stateObj.type === 'completed') return 'green';
        if (stateObj.type === 'canceled') return 'red';
      }
    } else if (dimension === FilterDimension.PRIORITY) {
      if (groupKey === '0') return 'red';
      if (groupKey === '1') return 'yellow';
      if (groupKey === '2') return 'green';
      if (groupKey === '3') return 'blue';
      if (groupKey === '4') return 'gray';
    }
    return 'blue';
  }

  // Helper function to truncate text
  function truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  // Update the board when issues are updated
  state.events.on('issues-updated', () => {
    renderBoard();
  });

  // Update the board when workflow states are updated
  state.events.on('states-updated', () => {
    renderBoard();
  });

  // Update the board when the filter dimension changes
  state.events.on('filter-dimension-changed', () => {
    renderBoard();
  });

  // Update the board when the selected issue changes
  state.events.on('issue-selected', (issueId) => {
    // Remove focus from all cards
    Object.values(issueElements).forEach((element) => {
      element.style.border.fg = 'gray';
    });
    
    // Add focus to the selected card
    if (issueId && issueElements[issueId]) {
      issueElements[issueId].style.border.fg = 'white';
    }
    
    boardBox.screen!.render();
  });
  
  // Update card styling when focused column changes
  state.events.on('focused-column-changed', () => {
    renderBoard();
  });
  
  // Update card styling when focused issue changes
  state.events.on('focused-issue-changed', () => {
    renderBoard();
  });

  // Initial render
  renderBoard();
}