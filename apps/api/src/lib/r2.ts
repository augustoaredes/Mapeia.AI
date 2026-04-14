import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'

const R2_ACCOUNT_ID    = process.env.R2_ACCOUNT_ID    ?? ''
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? ''
const R2_SECRET_KEY    = process.env.R2_SECRET_KEY    ?? ''
const R2_BUCKET        = process.env.R2_BUCKET        ?? 'mapeia-storage'

export const r2Enabled =
  !!R2_ACCOUNT_ID && !!R2_ACCESS_KEY_ID && !!R2_SECRET_KEY

let _client: S3Client | null = null
function getClient(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId:     R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_KEY,
      },
    })
  }
  return _client
}

/** Faz upload de um arquivo local para o R2 */
export async function r2Upload(localPath: string, r2Key: string): Promise<void> {
  const body        = fs.readFileSync(localPath)
  const contentType = guessContentType(localPath)
  await getClient().send(new PutObjectCommand({
    Bucket:      R2_BUCKET,
    Key:         r2Key,
    Body:        body,
    ContentType: contentType,
  }))
}

/** Faz upload de um Buffer para o R2 */
export async function r2UploadBuffer(
  buffer: Buffer,
  r2Key: string,
  contentType = 'application/octet-stream',
): Promise<void> {
  await getClient().send(new PutObjectCommand({
    Bucket:      R2_BUCKET,
    Key:         r2Key,
    Body:        buffer,
    ContentType: contentType,
  }))
}

/** Baixa um arquivo do R2 para um caminho local */
export async function r2Download(r2Key: string, localPath: string): Promise<void> {
  const res = await getClient().send(new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key:    r2Key,
  }))
  fs.mkdirSync(path.dirname(localPath), { recursive: true })
  await new Promise<void>((resolve, reject) => {
    const stream = fs.createWriteStream(localPath)
    ;(res.Body as Readable).pipe(stream)
    stream.on('finish', resolve)
    stream.on('error', reject)
  })
}

/** Retorna um Buffer com o conteúdo do objeto */
export async function r2DownloadBuffer(r2Key: string): Promise<Buffer> {
  const res = await getClient().send(new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key:    r2Key,
  }))
  const chunks: Buffer[] = []
  for await (const chunk of res.Body as Readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

/** Gera URL assinada para acesso temporário (padrão: 1 hora) */
export async function r2SignedUrl(r2Key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: r2Key }),
    { expiresIn },
  )
}

/** Lista todos os objetos com um prefixo */
export async function r2List(prefix: string): Promise<string[]> {
  const res = await getClient().send(new ListObjectsV2Command({
    Bucket: R2_BUCKET,
    Prefix: prefix,
  }))
  return (res.Contents ?? []).map(o => o.Key!).filter(Boolean)
}

/** Deleta todos os objetos com um prefixo (ex: ao excluir projeto) */
export async function r2DeletePrefix(prefix: string): Promise<void> {
  const keys = await r2List(prefix)
  if (!keys.length) return
  await getClient().send(new DeleteObjectsCommand({
    Bucket:  R2_BUCKET,
    Delete: { Objects: keys.map(Key => ({ Key })) },
  }))
}

/** Faz upload de todo um diretório local para o R2 */
export async function r2UploadDir(localDir: string, r2Prefix: string): Promise<void> {
  const entries = walkDir(localDir)
  for (const entry of entries) {
    const relative = path.relative(localDir, entry).replace(/\\/g, '/')
    await r2Upload(entry, `${r2Prefix}/${relative}`)
  }
}

/** Baixa todos os objetos de um prefixo para um diretório local */
export async function r2DownloadDir(r2Prefix: string, localDir: string): Promise<void> {
  const keys = await r2List(r2Prefix)
  for (const key of keys) {
    const relative = key.slice(r2Prefix.length).replace(/^\//, '')
    const localPath = path.join(localDir, relative)
    await r2Download(key, localPath)
  }
}

function walkDir(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) files.push(...walkDir(full))
    else files.push(full)
  }
  return files
}

function guessContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.tif': 'image/tiff', '.tiff': 'image/tiff',
    '.laz': 'application/octet-stream', '.las': 'application/octet-stream',
    '.zip': 'application/zip', '.json': 'application/json',
    '.bin': 'application/octet-stream', '.obj': 'text/plain',
    '.mtl': 'text/plain',
  }
  return map[ext] ?? 'application/octet-stream'
}
