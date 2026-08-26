import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { uploadStaticAssets } from './lib/cos-upload.mjs'
import { normalizeAssetPrefix } from './lib/static-assets.mjs'

const require = createRequire(import.meta.url)
const COS = require('cos-nodejs-sdk-v5')

function requireEnvironment(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

const secretId = requireEnvironment('COS_SECRET_ID')
const secretKey = requireEnvironment('COS_SECRET_KEY')
const bucket = requireEnvironment('COS_BUCKET')
const region = requireEnvironment('COS_REGION')
const version = requireEnvironment('STATIC_ASSET_VERSION')
const prefix = normalizeAssetPrefix(process.env.STATIC_ASSET_BASE_URL)
const distRoot = resolve(process.env.STATIC_ASSET_DIST_DIR || 'public')
const client = new COS({ SecretId: secretId, SecretKey: secretKey })

const uploaded = await uploadStaticAssets({
  client,
  bucket,
  region,
  version,
  distRoot,
  prefix
})

console.log(`Uploaded ${uploaded} static assets to COS version ${version}`)
