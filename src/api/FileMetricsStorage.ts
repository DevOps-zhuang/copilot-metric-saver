import * as fs from 'fs';
import path from 'path';
import { CopilotMetrics } from '../model/Copilot_Metrics';
import { GitHubMetricsApi } from './GitHubApi_copilot_metrics';
import { IMetricsStorage } from './IMetricsStorage';

import { Tenant } from '../model/Tenant';
import { dir } from 'console';

export class FileMetricsStorage implements IMetricsStorage {
    

    //private filePath: string = '';
    private scopeName: string = '';
    private scopeType: string = '';
    private token: string = '';
    private team?: string;
    private copilotMetricsApi: GitHubMetricsApi;


    private dirName: string = '../../data';
    private readonly ROOT_DIR: string = path.resolve(__dirname, '../../data');

    constructor(tenant: Tenant) {
        this.copilotMetricsApi = new GitHubMetricsApi(tenant);
        this.initializeScope(tenant);
        this.initializeFileFolder(tenant);
    }
    


    public initializeScope(tenant: Tenant) {
        // Initialize scope based on tenant information
        this.scopeName = tenant.scopeName;
        this.scopeType = tenant.scopeType;
        this.token = tenant.token;
        this.team=tenant.team;
    }

    private initializeFileFolder(tenant: Tenant) {
        // update the this.dirName to be the tenant's scopeType_scopeName folder. so all the files are in the same folder
        this.dirName = path.resolve(this.ROOT_DIR, `${tenant.scopeType}_${tenant.scopeName}`);
        console.log('dirName now is :', this.dirName);

        try {
            if (!this.dirName.startsWith(this.ROOT_DIR)) {
                throw new Error('Invalid directory path');
            }

            if (!fs.existsSync(this.dirName)) {
                fs.mkdirSync(this.dirName);
            }
            // Create a file named by ScopeName_metrics.json within ../data folder if it does not exist
            //  if (!fs.existsSync(this.ScopeFilePath)) {
            //      fs.writeFileSync(this.ScopeFilePath, '[]');
            //  }
        } catch (error) {
            console.error('Error in FileMetricsStorage constructor:', error);
        }
    }

    private getFilePath(teamSlug?: string): string {
        if (!teamSlug) {
            teamSlug = this.team;
        }
        if (teamSlug && teamSlug !== '') {
            return path.resolve(this.ROOT_DIR, `${this.scopeType}_${this.scopeName}`, `${teamSlug}_metrics.json`);
        } else {
            return path.resolve(this.ROOT_DIR, `${this.scopeType}_${this.scopeName}`, `${this.scopeType}_${this.scopeName}_metrics.json`);
        }
    }

    private getCurrentTimeFormatted(): string {
        const now = new Date();
        return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    }

    private getRandomTwoDigits(): string {
        return Math.floor(Math.random() * 90 + 10).toString(); // Random number between 10 and 99
    }

    private generateTimerFileFullName(teamSlug?: string): string {
        // if team is not provided, by default, will use the team information from the tenant
        if (!teamSlug) {
            teamSlug = this.team;
        }
   
        if (teamSlug && teamSlug.trim() !== '') {
            return path.resolve(this.ROOT_DIR, `${this.scopeType}_${this.scopeName}`, `team_${teamSlug}_${this.getCurrentTimeFormatted()}_${this.getRandomTwoDigits()}_metrics.json`);
        } else {
            return path.resolve(this.ROOT_DIR, `${this.scopeType}_${this.scopeName}`, `${this.scopeType}_${this.scopeName}_${this.getCurrentTimeFormatted()}_${this.getRandomTwoDigits()}_metrics.json`);
        }
    }

    public async getMetrics( teamSlug?: string): Promise<CopilotMetrics[]> {
        try {
            // if teamslug is not proviMetricsded, will use the team information from the tenant
            if (!teamSlug) {
                teamSlug = this.team;
            }
            const filePath = this.getFilePath(teamSlug);
            console.log(`filePath in getMetrics Data is , ${filePath}`);

            const data = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading Metrics data from file:', error);
            return [];
        }
    }

    public async saveMetrics(metrics: CopilotMetrics[], teamSlug?: string): Promise<boolean> {
        // if teamslug is provide, use it directly. if not, will use the team information from the tenant
        if (!teamSlug) {
            teamSlug = this.team;
            console.log('teamSlug is undefined, so will use the seat from the tenant, it  is :', teamSlug);
        } 
        const filePath = this.getFilePath(teamSlug);
        console.log(`filePath is , ${filePath}`);

         // Create a file named by ScopeName_metrics.json within ../data folder if it does not exist
         if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '[]');
        }
         
         try {
           /*  if (!metrics) {
                metrics = await getMetricsApi(this.scopeType, this.scopeName, this.token,this.team);
            } */
            if (!Array.isArray(metrics)) {
                throw new Error('Result is not an array.');
            }
    
            const dataToWrite = JSON.stringify(metrics, null, 2);
            const timerfileFullName = this.generateTimerFileFullName(teamSlug);
            console.log('timerfileFullName is :', timerfileFullName);
            fs.writeFileSync(timerfileFullName, dataToWrite);

            console.log('Metrics saved successfully to file:', timerfileFullName);
            await this.compareAndUpdateMetrics(metrics,undefined, teamSlug);
            return true;
        } catch (error) {
            console.error('Error saving metrics:', error);
            return false;
        }
    }
        
    private async compareAndUpdateMetrics(latestMetrics?: CopilotMetrics[], ScopeMetrics?: CopilotMetrics[], teamSlug?: string): Promise<void> {
            try {
            // if teamSlug is provided, will use it. if not, will use the team information from the tenant
            if (!teamSlug) {
                teamSlug = this.team;
            }
            console.log('teamSlug in compare and save methoid is :', teamSlug);
            console.log('teamSlug is :', teamSlug);
            if (!latestMetrics) { 
                console.log("No latest Metrics data provided. Will get it from API.");
                // if teamSlug is not '', will call the API with teamSlug. or will call getMetricsApi with undefined teamSlug without teamSlug
                if (teamSlug && teamSlug.trim()!=='') {
                    latestMetrics = await this.copilotMetricsApi.getTeamMetricsApi(teamSlug);
                }
                else {
                    latestMetrics = await this.copilotMetricsApi.getMetricsApi();
                }
                
            }
            if (!ScopeMetrics) {
            // console.log("No existing data provided. Will get it from file.");
                ScopeMetrics = await this.getMetrics(teamSlug);
            }

            // Validate data
            if (!Array.isArray(latestMetrics) || !Array.isArray(ScopeMetrics)) {
                throw new Error("Invalid data format. Both latestMetrics and ScopeMetrics should be arrays.");
            }

            // Initialize lists to track days of updated and added metrics
            const updatedDays: string[] = [];
            const addedDays: string[] = [];
            // console.log('latestMetrics:', latestMetrics);
            //console.log('ScopeMetrics:', ScopeMetrics);

            if (latestMetrics.length > 0) {
                latestMetrics.forEach(latestMetric => {
                    const existingMetricIndex = ScopeMetrics!.findIndex(orgMetric => orgMetric.date === latestMetric.date);

                    if (existingMetricIndex !== -1) {
                        // Update existing metric
                        ScopeMetrics![existingMetricIndex] = latestMetric;
                        updatedDays.push(latestMetric.date);
                    } else {
                        // Add new metric
                        ScopeMetrics!.push(latestMetric);
                        addedDays.push(latestMetric.date);
                    }
                });

                // Save to existing ScopeMetrics file only when there are some changes
                if (updatedDays.length > 0 || addedDays.length > 0) {
                    const filePath = this.getFilePath(teamSlug);
                    fs.writeFileSync(filePath, JSON.stringify(ScopeMetrics, null, 2));
                // console.log(`Days updated: ${updatedDays.join(', ')}, Days added: ${addedDays.join(', ')}`);

                    // Send notification
                    this.sendNotification(updatedDays, addedDays);
                }
            } else {
                console.log("No latest Metrics data provided.");
            }
        } catch (error) {
            console.error("Error in compareAndUpdateMetrics:", error);
        }
}

// Example notification method
private sendNotification(updatedDays: string[], addedDays: string[]): void {
    // Implement your notification logic here
    console.log(`Notification sent for updated days: ${updatedDays.join(', ')}, added days: ${addedDays.join(', ')}`);
}

async queryMetrics(since?: string, until?: string, page: number = 1, per_page: number = 28): Promise<CopilotMetrics[]> {
    try {
        //console.log('Querying Metrics data from file...， file name is ',this.ScopeFilePath);

        const filePath = this.getFilePath(this.team);
        console.log(`filePath is , ${filePath}`);

        const data = fs.readFileSync(filePath, 'utf-8');
        let metrics: CopilotMetrics[] = JSON.parse(data);

        if (since) {
            metrics = metrics.filter(metric => new Date(metric.date) >= new Date(since));
        }

        if (until) {
            metrics = metrics.filter(metric => new Date(metric.date) <= new Date(until));
        }

        const start = (page - 1) * per_page;
        const end = start + per_page;
        return metrics.slice(start, end);
    } catch (error) {
        console.error('Error querying Metrics data from file:', error);
        return [];
    }
}

}