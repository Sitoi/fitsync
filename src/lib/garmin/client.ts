import JSZip from 'jszip';
import FormData from 'form-data';
import {
  GarminActivityRaw,
  GarminCredentials,
  GarminProfile,
  GarminRegion,
  SavedSession,
} from '../types';

// Dynamic import or require of @gooin/garmin-connect
const { GarminConnect } = require('@gooin/garmin-connect');

export class GarminClient {
  public region: GarminRegion;
  public gc: any;
  private connected = false;

  constructor(region: GarminRegion) {
    this.region = region;
    const domain = region === 'CN' ? 'garmin.cn' : 'garmin.com';
    // Initialize GarminConnect instance with dummy credentials; real login or token load happens in connect()
    this.gc = new GarminConnect(
      {
        username: 'placeholder@placeholder.com',
        password: 'placeholder-password',
      },
      domain
    );
  }

  public get domain(): string {
    return this.region === 'CN' ? 'garmin.cn' : 'garmin.com';
  }

  public get isConnected(): boolean {
    return this.connected;
  }

  /**
   * Connect to Garmin Connect using either a saved OAuth session or credentials.
   */
  public async connect(credentials: GarminCredentials): Promise<{
    profile: GarminProfile;
    session: SavedSession;
  }> {
    const { username, password, session } = credentials;

    // 1. Try restoring from saved session first if available
    if (session?.token?.oauth1) {
      try {
        this.gc.loadToken(session.token.oauth1, session.token.oauth2);

        // Check if token works by requesting user profile
        const profileData = await this.gc.getUserProfile();
        this.connected = true;

        const currentSession = this.exportSession();
        return {
          profile: this.normalizeProfile(profileData),
          session: currentSession || session,
        };
      } catch (err: any) {
        console.warn(`[${this.region}] Restoring session failed: ${err.message}. Retrying password login...`);
      }
    }

    // 2. Fall back to username and password login
    if (!username || !password) {
      throw new Error(`Garmin ${this.region} 用户名和密码未提供，且无有效会话。`);
    }

    try {
      // Set credentials on gc config
      this.gc.config.username = username;
      this.gc.config.password = password;
      await this.gc.login(username, password);

      const profileData = await this.gc.getUserProfile();
      this.connected = true;

      const exported = this.exportSession();
      if (!exported) {
        throw new Error(`Garmin ${this.region} 登录成功但未能导出有效的 OAuth 会话。`);
      }

      return {
        profile: this.normalizeProfile(profileData),
        session: exported,
      };
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('401') || msg.includes('403')) {
        throw new Error(`Garmin ${this.region} 登录失败：账号或密码错误。`);
      }
      if (msg.includes('429')) {
        throw new Error(`Garmin ${this.region} 请求过于频繁 (HTTP 429)，请稍后重试。`);
      }
      throw new Error(`Garmin ${this.region} 登录失败: ${msg}`);
    }
  }

  /**
   * Export the verified OAuth session tokens
   */
  public exportSession(): SavedSession | null {
    try {
      const tokens = this.gc.exportToken();
      if (!tokens?.oauth1) return null;
      return {
        token: {
          oauth1: tokens.oauth1,
          oauth2: tokens.oauth2,
        },
      };
    } catch {
      return null;
    }
  }

  /**
   * Fetch a page of activities
   */
  public async getActivities(options: {
    start: number;
    limit: number;
    startDate?: string;
    endDate?: string;
  }): Promise<GarminActivityRaw[]> {
    const { start, limit, startDate, endDate } = options;
    try {
      const items = await this.gc.getActivities(
        start,
        limit,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        startDate,
        endDate
      );
      if (!Array.isArray(items)) {
        return [];
      }
      return items as GarminActivityRaw[];
    } catch (err: any) {
      console.error(`[${this.region}] Failed to get activities (offset ${start}):`, err);
      throw err;
    }
  }

  /**
   * Download original activity data from Garmin and extract FIT or TCX file in memory
   */
  public async downloadActivity(activityId: string | number): Promise<{
    buffer: Buffer;
    filename: string;
    format: 'fit' | 'tcx';
  }> {
    const downloadUrl = `${this.gc.url.DOWNLOAD_ZIP}${activityId}`;

    let zipData: ArrayBuffer;
    try {
      const response = await this.gc.client.client.get(downloadUrl, {
        responseType: 'arraybuffer',
        timeout: 45000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
      });
      zipData = response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 404) {
        const notFoundErr = new Error(`Activity ${activityId} not found (404)`);
        (notFoundErr as any).isPermanent = true;
        throw notFoundErr;
      }
      throw new Error(`Download activity ${activityId} failed: ${error?.message || status}`);
    }

    try {
      const zip = await JSZip.loadAsync(Buffer.from(zipData));
      
      // Look for .fit file inside the zip (often named `${activityId}_ACTIVITY.fit`)
      const fitEntry = Object.values(zip.files).find(
        (f) => !f.dir && f.name.toLowerCase().endsWith('.fit')
      );
      if (fitEntry) {
        const buffer = await fitEntry.async('nodebuffer');
        return {
          buffer,
          filename: `${activityId}.fit`,
          format: 'fit',
        };
      }

      // Fallback: look for .tcx
      const tcxEntry = Object.values(zip.files).find(
        (f) => !f.dir && f.name.toLowerCase().endsWith('.tcx')
      );
      if (tcxEntry) {
        const buffer = await tcxEntry.async('nodebuffer');
        return {
          buffer,
          filename: `${activityId}.tcx`,
          format: 'tcx',
        };
      }

      throw new Error(`Archive for activity ${activityId} contains neither FIT nor TCX files.`);
    } catch (zipErr: any) {
      throw new Error(`Failed to extract activity archive for ${activityId}: ${zipErr.message}`);
    }
  }

  /**
   * Upload activity buffer to Garmin
   */
  public async uploadActivity(
    fileBuffer: Buffer,
    filename: string,
    format: 'fit' | 'tcx' = 'fit'
  ): Promise<{
    success: boolean;
    status: 'uploaded' | 'already_exists' | 'failed';
    error?: string;
  }> {
    const uploadUrl = `${this.gc.url.UPLOAD}.${format}`;

    try {
      const form = new FormData();
      form.append('userfile', fileBuffer, {
        filename,
        contentType: 'application/octet-stream',
      });

      const headers = form.getHeaders();
      const response = await this.gc.client.client.post(uploadUrl, form, {
        headers,
        timeout: 60000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        validateStatus: (status: number) => (status >= 200 && status < 300) || status === 409,
      });

      if (response.status === 409) {
        return {
          success: true,
          status: 'already_exists',
        };
      }

      return {
        success: true,
        status: 'uploaded',
      };
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 409) {
        return {
          success: true,
          status: 'already_exists',
        };
      }
      const errMsg = error?.response?.data?.message || error?.message || 'Upload error';
      return {
        success: false,
        status: 'failed',
        error: `HTTP ${status || 'ERR'}: ${errMsg}`,
      };
    }
  }

  private normalizeProfile(raw: any): GarminProfile {
    return {
      displayName: raw?.displayName || raw?.userName || raw?.fullName || 'Garmin User',
      fullName: raw?.fullName,
      userName: raw?.userName,
      profileId: raw?.profileId,
      profileImageUrl: raw?.profileImageUrlMedium || raw?.profileImageUrlSmall,
      region: this.region,
    };
  }
}
