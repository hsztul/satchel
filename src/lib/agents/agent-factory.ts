import { Agent } from "./types";
import { EntryAgent } from "./entry-agent";
import { ArticleContentAgent } from "./article-content-agent";
import { ArticleSummaryAgent } from "./article-summary-agent";
import { CompanySummaryAgent } from "./company-summary-agent";

/**
 * Agent Factory
 * 
 * This factory creates and returns the appropriate agent based on the agent name.
 */
export class AgentFactory {
  private static agents: Record<string, Agent> = {};

  /**
   * Get an agent instance by name
   */
  static getAgent(agentName: string): Agent {
    // Check if we already have an instance of this agent
    if (this.agents[agentName]) {
      return this.agents[agentName];
    }

    // Create a new instance based on the agent name
    let agent: Agent;
    
    switch (agentName) {
      case "entry-agent":
        agent = new EntryAgent();
        break;
        
      case "article-content-agent":
        agent = new ArticleContentAgent();
        break;
        
      case "article-summary-agent":
        agent = new ArticleSummaryAgent();
        break;
        
      case "company-summary-agent":
        agent = new CompanySummaryAgent();
        break;
        
      default:
        throw new Error(`Unknown agent: ${agentName}`);
    }

    // Cache the agent instance
    this.agents[agentName] = agent;
    
    return agent;
  }
}
