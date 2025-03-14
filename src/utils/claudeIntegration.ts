import { LinearIssue, IssueQueryParams } from '../types/linear';
import axios from 'axios';

interface ClaudeIntegrationConfig {
  apiUrl: string;
  webhookUrl?: string;
}

class ClaudeIntegration {
  private config: ClaudeIntegrationConfig;

  constructor(config: ClaudeIntegrationConfig) {
    this.config = config;
  }

  /**
   * Formats issues for display in Claude
   */
  formatIssuesForClaude(issues: LinearIssue[]): string {
    if (!issues.length) return 'No issues found matching your criteria.';

    let output = `# Found ${issues.length} issues\n\n`;

    // Group by team
    const issuesByTeam = issues.reduce((acc, issue) => {
      const teamKey = issue.team.key;
      if (!acc[teamKey]) acc[teamKey] = [];
      acc[teamKey].push(issue);
      return acc;
    }, {} as Record<string, LinearIssue[]>);

    // Format each team's issues
    Object.entries(issuesByTeam).forEach(([teamKey, teamIssues]) => {
      output += `## Team ${teamKey} (${teamIssues.length} issues)\n\n`;
      
      teamIssues.forEach(issue => {
        const state = issue.state.name;
        const assignee = issue.assignee ? issue.assignee.name : 'Unassigned';
        const priority = ['No Priority', 'Urgent', 'High', 'Medium', 'Low'][issue.priority] || 'Unknown';
        const labels = issue.labels.map(l => l.name).join(', ') || 'None';
        
        output += `### ${issue.identifier}: ${issue.title}\n`;
        output += `**State:** ${state} | **Assignee:** ${assignee} | **Priority:** ${priority}\n`;
        output += `**Labels:** ${labels}\n`;
        if (issue.description) {
          output += `\n${issue.description.substring(0, 200)}${issue.description.length > 200 ? '...' : ''}\n`;
        }
        output += `\n---\n\n`;
      });
    });

    return output;
  }

  /**
   * Gets issues from the MCP API and formats them for Claude
   */
  async getIssuesForClaude(params: IssueQueryParams): Promise<string> {
    try {
      const response = await axios.get(`${this.config.apiUrl}/api/issues`, { params });
      
      if (response.data.success && response.data.data) {
        return this.formatIssuesForClaude(response.data.data);
      } else {
        return 'Error fetching issues: ' + (response.data.error || 'Unknown error');
      }
    } catch (error: any) {
      return `Error connecting to MCP server: ${error.message}`;
    }
  }

  /**
   * Gets a team report from the MCP API and formats it for Claude
   */
  async getTeamReportForClaude(params: Partial<IssueQueryParams>): Promise<string> {
    try {
      const response = await axios.get(`${this.config.apiUrl}/api/reports/team-stats`, { params });
      
      if (!response.data.success || !response.data.data) {
        return 'Error fetching team report: ' + (response.data.error || 'Unknown error');
      }
      
      const stats = response.data.data;
      if (!stats.length) return 'No team data found for the specified criteria.';

      let output = `# Team Statistics Report\n\n`;
      
      stats.forEach((team: any) => {
        output += `## ${team.teamName}\n\n`;
        output += `- **Total Issues:** ${team.totalIssues}\n`;
        
        // Issue states breakdown
        output += `- **Issues by State:**\n`;
        Object.entries(team.issuesByState).forEach(([state, count]) => {
          output += `  - ${state}: ${count}\n`;
        });
        
        // Issue priorities breakdown
        output += `- **Issues by Priority:**\n`;
        Object.entries(team.issuesByPriority).forEach(([priority, count]) => {
          const priorityName = ['No Priority', 'Urgent', 'High', 'Medium', 'Low'][parseInt(priority)] || priority;
          output += `  - ${priorityName}: ${count}\n`;
        });
        
        // Health metrics
        output += `- **Issue Health:**\n`;
        output += `  - Issues without labels: ${team.issuesWithoutLabels} (${Math.round(team.issuesWithoutLabels / team.totalIssues * 100)}%)\n`;
        output += `  - Issues without description: ${team.issuesWithoutDescription} (${Math.round(team.issuesWithoutDescription / team.totalIssues * 100)}%)\n`;
        
        if (team.averageTimeToClose !== null) {
          output += `  - Average time to close: ${team.averageTimeToClose.toFixed(1)} days\n`;
        }
        
        output += `\n`;
      });
      
      return output;
    } catch (error: any) {
      return `Error connecting to MCP server: ${error.message}`;
    }
  }

  /**
   * Sends data to Claude webhook
   */
  async sendToClaudeWebhook(data: any): Promise<boolean> {
    if (!this.config.webhookUrl) {
      throw new Error('Webhook URL not configured');
    }
    
    try {
      await axios.post(this.config.webhookUrl, data);
      return true;
    } catch (error) {
      console.error('Error sending to Claude webhook:', error);
      return false;
    }
  }
}

export default ClaudeIntegration;