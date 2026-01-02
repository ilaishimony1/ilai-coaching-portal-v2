
import { ClientData, LandingPageConfig } from './types';

export class CloudSyncService {
  private url: string;
  private key: string;

  constructor(url: string, key: string) {
    this.url = url.replace(/\/$/, '');
    this.key = key;
  }

  private async request(path: string, method: string = 'GET', body?: any) {
    const headers: Record<string, string> = {
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    if (method === 'POST' || method === 'PATCH') {
      headers['Prefer'] = 'resolution=merge-duplicates,return=representation';
    }

    const response = await fetch(`${this.url}/rest/v1/${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`DB Error: ${response.status} - ${err}`);
    }

    return response.json();
  }

  // Added testConnection to resolve error in AdminDashboard.tsx on line 58
  async testConnection() {
    try {
      await this.request('app_data?limit=1', 'GET');
      return true;
    } catch (e) {
      console.error("Connection test failed", e);
      return false;
    }
  }

  async loadAppState() {
    try {
      const data = await this.request('app_data?id=eq.global_state', 'GET');
      return data?.[0]?.payload || null;
    } catch (e) {
      return null;
    }
  }

  async saveAppState(data: { clients: ClientData[], config: LandingPageConfig }) {
    return this.request('app_data', 'POST', {
      id: 'global_state',
      payload: data,
      updated_at: new Date().toISOString()
    });
  }
}
