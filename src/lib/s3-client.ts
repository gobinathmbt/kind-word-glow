import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

export interface S3Config {
  region: string;
  bucket: string;
  access_key: string;
  secret_key: string;
  url?: string;
  folder?: string;
}

export interface UploadResult {
  url: string;
  key: string;
  size: number;
}

export class S3Uploader {
  private client: S3Client;
  private bucket: string;
  private baseUrl: string;

  constructor(config: S3Config) {
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.access_key,
        secretAccessKey: config.secret_key,
      },
    });
    this.bucket = config.bucket;
    this.baseUrl =
      config.url ||
      `https://${config.bucket}.s3.${config.region}.amazonaws.com/`;
  }

  private getUserFromSession() {
    try {
      const userStr = sessionStorage.getItem("user") ||sessionStorage.getItem("supplier_user") ;
      if (userStr) {
        return JSON.parse(userStr);
      }
    } catch (error) {
      console.error("Error getting user from session:", error);
    }
    return null;
  }

  private generateFolderPath(category: string): string {
    const user = this.getUserFromSession();
    if (!user) {
      throw new Error("User session not found");
    }

    const companyId = user.company_name;
    const userId = user.id;

    return `${companyId}/${userId}/${category}`;
  }

  async uploadFile(
    file: File,
    category: string = "document"
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(
      /[^a-zA-Z0-9.-]/g,
      "_"
    )}`;
    const folderPath = this.generateFolderPath(category);
    const key = `${folderPath}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer(); // ✅ Convert to ArrayBuffer for AWS

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: new Uint8Array(arrayBuffer), // ✅ Use Uint8Array, works in browser
      ContentType: file.type,
      ACL: "public-read",
    });

    await this.client.send(command);

    const url = this.baseUrl.endsWith("/")
      ? `${this.baseUrl}${key}`
      : `${this.baseUrl}/${key}`;

    return {
      url,
      key,
      size: file.size,
    };
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  getPublicUrl(key: string): string {
    return this.baseUrl.endsWith("/")
      ? `${this.baseUrl}${key}`
      : `${this.baseUrl}/${key}`;
  }
}
