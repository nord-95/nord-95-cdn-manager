import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";
import { 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand, 
  ListObjectsV2Command 
} from "@aws-sdk/client-s3";

const endpoint = process.env.R2_ACCOUNT_HOST
  ? `https://${process.env.R2_ACCOUNT_HOST}`
  : `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

export function r2() {
  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function signPutUrl(
  bucket: string, 
  key: string, 
  contentType = "application/octet-stream", 
  expires = 900
) {
  const client = r2();
  const cmd = new PutObjectCommand({ 
    Bucket: bucket, 
    Key: key, 
    ContentType: contentType 
  });
  return awsGetSignedUrl(client, cmd, { expiresIn: expires });
}

export async function signGetUrl(
  bucket: string, 
  key: string, 
  expires = 3600
) {
  const client = r2();
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return awsGetSignedUrl(client, cmd, { expiresIn: expires });
}

export async function listObjects(
  bucket: string, 
  prefix = "", 
  token?: string
) {
  const client = r2();
  const res = await client.send(new ListObjectsV2Command({ 
    Bucket: bucket, 
    Prefix: prefix, 
    ContinuationToken: token, 
    MaxKeys: 1000 
  }));
  return res;
}

export async function deleteObject(bucket: string, key: string) {
  const client = r2();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
