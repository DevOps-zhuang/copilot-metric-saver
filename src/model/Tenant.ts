// model/Tenant.ts
import { getUsageApi } from '../api/GitHubApi'; 
import { getMetric } from '../api/GetMetrics';

export class Tenant {
    public scopeType: 'organization' | 'enterprise';
    public scopeName: string;
    public token: string;
    public team: string; // Add team property
    public isActive: boolean;

    constructor(scopeType: 'organization' | 'enterprise', scopeName: string, token: string, team: string = '', isActive: boolean = true) {
        this.scopeType = scopeType;
        this.scopeName = scopeName;
        this.token = token;
        this.team = team; // Assign team property
        this.isActive = isActive;

        // Validate tenant using GitHub API
       // this.validateTenant();
    }

    public async validateTenant(): Promise<boolean> {
        try {
            await getMetric(this.scopeType, this.scopeName, this.token, false, 'github');
            return true;
        } catch (error) {
            throw new Error('Invalid tenant information: scopeType, scopeName, or token is incorrect');
            return false;
        }
    }
}