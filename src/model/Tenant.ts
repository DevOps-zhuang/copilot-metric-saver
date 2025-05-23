// model/Tenant.ts
import { verifyApiAccess } from '../api/GitHubApi'; 
// Updated import to use verifyApiAccess instead of getUsageApi

export class Tenant {
    public scopeType: 'organization' | 'enterprise';
    public scopeName: string;
    public token: string;
    public team: string; 
    public isActive: boolean;

    constructor(scopeType: 'organization' | 'enterprise', scopeName: string, token: string, team: string = '', isActive: boolean = true) {
        this.scopeType = scopeType;
        this.scopeName = scopeName;
        this.token = token;
        this.team = team;
        this.isActive = isActive;
    }

    /**
     * Validates if the tenant has access rights to GitHub API
     * @returns true if API access is successful, throws error otherwise
     */
    public async validateApiAccess(): Promise<boolean> {
        try {
            // Use verifyApiAccess which is more efficient as it only checks access permissions
            return await verifyApiAccess(this.scopeType, this.scopeName, this.token);
        } catch (error) {
            throw new Error('API access validation failed: invalid scopeType, scopeName, or token');
        }
    }
}

// Generated by Zhuang