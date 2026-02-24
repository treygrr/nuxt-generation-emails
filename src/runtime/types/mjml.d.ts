declare module 'mjml-browser' {
  interface MjmlError {
    line: number
    message: string
    tagName: string
    formattedMessage: string
  }

  interface MjmlResult {
    html: string
    errors: MjmlError[]
  }

  interface MjmlOptions {
    fonts?: Record<string, string>
    keepComments?: boolean
    beautify?: boolean
    minify?: boolean
    validationLevel?: 'strict' | 'soft' | 'skip'
    filePath?: string
    preprocessors?: Array<(xml: string) => string>
  }

  function mjml2html(mjml: string, options?: MjmlOptions): MjmlResult
  export default mjml2html
}

declare module '*.mjml?raw' {
  const content: string
  export default content
}
