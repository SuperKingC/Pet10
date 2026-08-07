declare module 'ali-oss' {
  interface OssClientOptions {
    region: string
    bucket: string
    accessKeyId: string
    accessKeySecret: string
    secure?: boolean
  }

  interface SignatureRequest {
    headers?: Record<string, string>
    queries?: Record<string, string>
  }

  class OSS {
    constructor(options: OssClientOptions)
    signatureUrlV4(
      method: string,
      expires: number,
      request: SignatureRequest,
      objectName: string,
      additionalHeaders?: string[]
    ): Promise<string>
  }

  export default OSS
}
