const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');
const fs = require('fs');

const SEAWEED_S3_URL = process.env.SEAWEED_S3_URL;
const SEAWEED_BUCKET = process.env.SEAWEED_BUCKET;

const PRESIGNED_URL_EXPIRY = 60 * 60 * 24 * 7;

const STORAGE_KEY_PREFIXES = [
  'profile_images/',
  'defaults/',
  'meal_images/',
  'banners/',
  'predictions/',
  'recipe_images/',
];

class StorageService {
  constructor() {
    this.s3 = new S3Client({
      endpoint: SEAWEED_S3_URL,
      region: 'us-east-1',
      forcePathStyle: true,
      useDualstackEndpoint: false,
      responseChecksumValidation: 'WHEN_REQUIRED',
      requestChecksumCalculation: 'WHEN_REQUIRED',
      credentials: {
        accessKeyId: process.env.SEAWEED_ACCESS_KEY,
        secretAccessKey: process.env.SEAWEED_SECRET_KEY,
      },
    });
    this.bucketName = SEAWEED_BUCKET;
    this.endpointHostname = new URL(SEAWEED_S3_URL).hostname;
    this.init();
  }

  async init() {
    await this.ensureBucketExists();
  }

  async ensureBucketExists() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      console.log(`[+] SeaweedFS bucket "${this.bucketName}" reachable`);
    } catch (err) {
      const status = err.$metadata?.httpStatusCode;
      if (status === 404) {
        console.error(`[!] SeaweedFS bucket "${this.bucketName}" does not exist. Create it manually in the SeaweedFS admin UI.`);
      } else if (status === 403) {
        console.error(`[!] SeaweedFS bucket "${this.bucketName}" access denied. Check the credentials and policy in the SeaweedFS admin UI.`);
      } else {
        console.error(`[!] SeaweedFS bucket check failed:`, err.message);
      }
    }
  }

  async getPresignedUrl(objectKey) {
    try {
      return await getSignedUrl(
        this.s3,
        new GetObjectCommand({ Bucket: this.bucketName, Key: objectKey }),
        { expiresIn: PRESIGNED_URL_EXPIRY }
      );
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw error;
    }
  }

  async getPresignedUrlForStored(value) {
    if (!value) return null;
    const key = this.getObjectKeyFromAny(value);
    if (!key) return value;
    try {
      return await this.getPresignedUrl(key);
    } catch (error) {
      console.error('Error resolving presigned URL for stored value:', error);
      return null;
    }
  }

  getObjectKeyFromAny(value) {
    if (!value) return null;
    if (this.isStorageUrl(value)) return this.getObjectKeyFromUrl(value);
    if (STORAGE_KEY_PREFIXES.some((prefix) => value.startsWith(prefix))) return value;
    return null;
  }

  getObjectKeyFromUrl(url) {
    if (!url) return null;
    try {
      if (!this.isStorageUrl(url)) return null;
      const urlPath = new URL(url).pathname;
      return urlPath.substring(
        urlPath.indexOf(this.bucketName) + this.bucketName.length + 1
      );
    } catch (error) {
      console.error('Error parsing object URL:', error);
      return null;
    }
  }

  isStorageUrl(url) {
    if (!url) return false;
    try {
      const urlObject = new URL(url);
      return (
        urlObject.hostname === this.endpointHostname &&
        urlObject.pathname.includes(this.bucketName)
      );
    } catch {
      return false;
    }
  }

  isStorageAsset(value) {
    if (!value) return false;
    if (this.isStorageUrl(value)) return true;
    return STORAGE_KEY_PREFIXES.some((prefix) => value.startsWith(prefix));
  }

  async uploadProfileImage(userId, imageBuffer) {
    const objectName = `profile_images/${userId}-${Date.now()}.png`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: objectName,
        Body: imageBuffer,
        ContentType: 'image/png',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );
    return objectName;
  }

  async uploadFile(buffer, objectName, contentType) {
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: objectName,
          Body: buffer,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );
      return objectName;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async uploadFileFromPath(filePath, objectName, contentType) {
    try {
      const { size } = fs.statSync(filePath);
      const stream = fs.createReadStream(filePath);
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: objectName,
          Body: stream,
          ContentType: contentType,
          ContentLength: size,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );
      return objectName;
    } catch (error) {
      console.error('Error uploading file from path:', error);
      throw error;
    }
  }

  async uploadBannerImage(buffer, filename) {
    try {
      const objectName = `banners/${Date.now()}-${filename}`;
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: objectName,
          Body: buffer,
          ContentType: 'image/jpeg',
          CacheControl: 'public, max-age=31536000, immutable',
          Metadata: { usage: 'banner' },
        })
      );
      return objectName;
    } catch (error) {
      console.error('Error uploading banner image:', error);
      throw error;
    }
  }

  async getDefaultProfileImage() {
    try {
      const defaultImageKey = 'defaults/profile.png';
      let exists = false;
      try {
        await this.s3.send(
          new HeadObjectCommand({ Bucket: this.bucketName, Key: defaultImageKey })
        );
        exists = true;
      } catch {
        exists = false;
      }

      if (!exists) {
        const defaultImagePath = path.join(__dirname, '../profile/profile.png');
        try {
          const fileBuffer = fs.readFileSync(defaultImagePath);
          await this.s3.send(
            new PutObjectCommand({
              Bucket: this.bucketName,
              Key: defaultImageKey,
              Body: fileBuffer,
              ContentType: 'image/png',
            })
          );
          console.log(`Default profile image uploaded to ${defaultImageKey}`);
        } catch (readError) {
          console.error('Error reading default profile image file:', readError);
          return null;
        }
      }

      return defaultImageKey;
    } catch (error) {
      console.error('Error getting default profile image:', error);
      return null;
    }
  }

  async removeProfileImage(value) {
    try {
      if (!value) return false;
      const objectKey = this.getObjectKeyFromAny(value);
      if (!objectKey) return false;
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucketName, Key: objectKey })
      );
      return true;
    } catch (error) {
      console.error('Error removing profile image:', error);
      return false;
    }
  }

  async getObjectUrl(objectKey) {
    return this.getPresignedUrlForStored(objectKey);
  }

  async listObjects(prefix = '') {
    try {
      const objects = [];
      let continuationToken;
      do {
        const resp = await this.s3.send(
          new ListObjectsV2Command({
            Bucket: this.bucketName,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          })
        );
        if (resp.Contents) objects.push(...resp.Contents);
        continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
      } while (continuationToken);
      return objects;
    } catch (error) {
      console.error('Error listing objects:', error);
      return [];
    }
  }

  async getFileStream(objectName) {
    const resp = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucketName, Key: objectName })
    );
    return resp.Body;
  }
}

const seaweedService = new StorageService();
module.exports = seaweedService;
