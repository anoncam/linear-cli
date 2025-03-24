/**
 * Relationship Graph Component
 * 
 * This component displays a visual graph of issue relationships
 */

import blessed from 'neo-blessed';
import { KanbanState, ViewMode } from '../state/kanbanState';
import { LinearIssue, LinearIssueRelation } from '../../types/linear';
import { LinearApiService } from '../services/linearApiService';

/**
 * Set up the relationship graph view
 */
export function setupRelationshipGraph(
  graphBox: ReturnType<typeof blessed.box>,
  state: KanbanState,
  apiService?: LinearApiService
): void {
  // Set property to identify this box
  graphBox.isRelationshipGraph = true;

  // Create graph visualization container
  const graphContainer = blessed.box({
    parent: graphBox,
    top: 0,
    left: 0,
    right: 0,
    bottom: 4,
    scrollable: true,
    tags: true,
    style: {
      fg: 'white',
    },
  });

  // Create navigation instructions
  const instructions = blessed.text({
    parent: graphBox,
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    content: '{bold}Controls:{/bold} [Esc] Close | [Enter] Select Issue | [r] Refresh',
    tags: true,
    style: {
      fg: 'white',
      bg: 'blue',
    },
  });

  // Create title
  const title = blessed.text({
    parent: graphBox,
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    content: '{center}{bold}Issue Relationship Graph{/bold}{/center}',
    tags: true,
    style: {
      fg: 'white',
      bg: 'blue',
    },
  });

  // Function to create a simple box for an issue node
  function createIssueNode(issue: LinearIssue | LinearIssueRelation, x: number, y: number, type: string): blessed.Widgets.BoxElement {
    const color = getColorForRelationType(type);
    
    const box = blessed.box({
      parent: graphContainer,
      top: y,
      left: x,
      width: 20,
      height: 3,
      content: `{center}${issue.identifier}{/center}`,
      tags: true,
      border: {
        type: 'line',
      },
      style: {
        fg: 'white',
        bg: 'black',
        border: {
          fg: color,
        },
        hover: {
          bg: 'blue',
        },
      },
    });
    
    // Store issue data on the box for reference
    box.issueData = issue;
    box.relationType = type;
    
    return box;
  }
  
  // Helper function to draw a simple "line" between boxes using ASCII characters
  function drawConnectionLine(
    fromBox: blessed.Widgets.BoxElement, 
    toBox: blessed.Widgets.BoxElement, 
    relationshipType: string
  ): void {
    const fromX = fromBox.left + Math.floor(fromBox.width! / 2);
    const fromY = fromBox.top + fromBox.height!;
    const toX = toBox.left + Math.floor(toBox.width! / 2);
    const toY = toBox.top;
    
    // Direction indicator symbol based on relationship type
    let symbol = '─';
    if (relationshipType === 'parent') symbol = '↑';
    else if (relationshipType === 'child') symbol = '↓';
    else if (relationshipType === 'blocks') symbol = '→';
    else if (relationshipType === 'blocked_by') symbol = '←';
    else if (relationshipType === 'related') symbol = '↔';
    
    const color = getColorForRelationType(relationshipType);
    
    // Create a simple vertical line
    const line = blessed.text({
      parent: graphContainer,
      top: fromY,
      left: fromX,
      content: `{${color}-fg}${symbol}{/${color}-fg}`,
      tags: true,
    });
    
    // Add relationship label
    const label = blessed.text({
      parent: graphContainer,
      top: Math.floor((fromY + toY) / 2),
      left: Math.floor((fromX + toX) / 2) - 5,
      content: `{${color}-fg}${relationshipType}{/${color}-fg}`,
      tags: true,
    });
  }
  
  // Helper function to get color for relationship type
  function getColorForRelationType(type: string): string {
    switch (type) {
      case 'parent':
      case 'child':
        return 'green';
      case 'blocks':
      case 'blocked_by':
        return 'red';
      case 'related':
        return 'cyan';
      case 'duplicate':
        return 'yellow';
      default:
        return 'white';
    }
  }

  // Function to render the relationship graph for an issue
  async function renderRelationshipGraph(issueId: string): Promise<void> {
    // Clear previous content
    graphContainer.children.forEach(child => {
      graphContainer.remove(child);
    });
    
    if (!apiService) {
      graphContainer.setContent('{center}API service not available{/center}');
      graphBox.screen.render();
      return;
    }
    
    graphContainer.setContent('{center}Loading relationship data...{/center}');
    graphBox.screen.render();
    
    try {
      const issue = state.issues.find(i => i.id === issueId);
      if (!issue) {
        graphContainer.setContent('{center}Issue not found{/center}');
        graphBox.screen.render();
        return;
      }
      
      // Set title
      title.setContent(`{center}{bold}Relationships for ${issue.identifier}: ${issue.title.substring(0, 30)}{/bold}{/center}`);
      
      // Get all relationships for this issue
      const relations = await apiService.getIssueRelations(issueId);
      
      if (relations.length === 0) {
        graphContainer.setContent('{center}No relationships found for this issue{/center}');
        graphBox.screen.render();
        return;
      }
      
      // Create center node for the current issue
      const centerNode = createIssueNode(issue, 30, 10, 'current');
      
      // Track all created nodes
      const nodes: blessed.Widgets.BoxElement[] = [centerNode];
      
      // Calculate positions for related issues in a circular pattern
      const radius = 15;
      const totalRelations = relations.length;
      const angleStep = (2 * Math.PI) / totalRelations;
      
      relations.forEach((relation, index) => {
        // Calculate position in a circle around the center node
        const angle = index * angleStep;
        const x = 30 + Math.floor(radius * Math.cos(angle));
        const y = 10 + Math.floor(radius * Math.sin(angle));
        
        // Create node for related issue
        const relatedNode = createIssueNode(relation.issue, x, y, relation.type);
        nodes.push(relatedNode);
        
        // Draw connection line
        drawConnectionLine(centerNode, relatedNode, relation.type);
      });
      
      // Add click behavior to nodes
      nodes.forEach(node => {
        node.on('click', () => {
          if (node.issueData && node.issueData.id) {
            // Show details for the clicked issue
            state.setSelectedIssue(node.issueData.id);
            state.setViewMode(ViewMode.DETAIL);
          }
        });
      });
      
      graphBox.screen.render();
    } catch (error) {
      console.error('Error rendering relationship graph:', error);
      graphContainer.setContent('{center}Error loading relationship data{/center}');
      graphBox.screen.render();
    }
  }

  // Update when selected issue changes
  state.events.on('issue-selected', (issueId) => {
    if (issueId && state.viewMode === ViewMode.RELATIONSHIP_GRAPH) {
      renderRelationshipGraph(issueId);
    }
  });

  // Show/hide graph when view mode changes
  state.events.on('view-mode-changed', (mode) => {
    if (mode === ViewMode.RELATIONSHIP_GRAPH) {
      graphBox.show();
      if (state.selectedIssueId) {
        renderRelationshipGraph(state.selectedIssueId);
      }
    } else {
      graphBox.hide();
    }
    graphBox.screen.render();
  });

  // Handle escape key to close graph view
  graphBox.key(['escape'], () => {
    state.setViewMode(ViewMode.KANBAN);
    graphBox.screen.render();
  });

  // Handle refresh key
  graphBox.key(['r'], () => {
    if (state.selectedIssueId) {
      renderRelationshipGraph(state.selectedIssueId);
    }
  });

  // Handle enter key to view issue details
  graphBox.key(['enter'], () => {
    if (state.selectedIssueId) {
      state.setViewMode(ViewMode.DETAIL);
      graphBox.screen.render();
    }
  });

  // Initial state
  graphBox.hide();
}