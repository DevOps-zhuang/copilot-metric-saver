
import { CopilotMetricsStorageService } from './CopilotMetricsStorageService';
import { MySQLUsageStorage } from './MySQLUsageStorage';
import { MySQLMetricsStorage } from './MySQLMetricsStorage';
import { FileMetricsStorage } from './FileMetricsStorage';
import { CopilotSeatStorageService } from './CopilotSeatStorageService';
import { MySQLSeatStorage } from './MySQLSeatStorage';
import { FileSeatStorage } from './FileSeatStorage';
import { storage_config } from '../../config';
import { Tenant } from '../model/Tenant';
import { TenantServiceFactory } from './TenantServiceFactory';

export class CopilotServiceFactory {

  static async createSeatService(tenant?: Tenant, scopeName?: string) {
    // if the tenant is not provided, get it from the storage
    if (!tenant) {
      console.log('Tenant is missing, will querying it by scopeName');
      throw new Error('Tenant not found');
    
    }

    let seatStorage;
    switch (storage_config.storage_type) {
      case 'mysql':
        seatStorage = new MySQLSeatStorage(tenant);
        break;
      case 'file':
      default:
        seatStorage = new FileSeatStorage(tenant);
        break;
    }

    return new CopilotSeatStorageService(seatStorage, tenant);
  }

  static async createMetricsService(tenant: Tenant) {
    // if the tenant is not provided, get it from the storage
    if (!tenant) {
      throw new Error('Tenant is needed');
    }
  
    let metricsStorage;
    switch (storage_config.storage_type) {
      case 'mysql':
        metricsStorage = new MySQLMetricsStorage(tenant);
        break;
      case 'file':
      default:
        metricsStorage = new FileMetricsStorage(tenant);
        break;
    }

    return new CopilotMetricsStorageService(metricsStorage, tenant);
  }
}