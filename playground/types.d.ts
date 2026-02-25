declare global {
  enum BannerCode {
    PLATT = 'platt',
    REXEL = 'rexel',
    GEXPRO = 'gexpro',
  }

  interface FooterTextMessage {
    text: string
    html?: never
  }

  interface FooterHtmlMessage {
    html: string
    text?: never
  }

  type FooterMessage = FooterTextMessage | FooterHtmlMessage

  interface EmailFooterConfig {
    bannerName: string
    siteUrl: string
    siteName: string
    contactUsUrl: string
    privacyUrl: string
    termsUrl: string
    mobileAppUrl: string
    callMessage: string
    contactPhone: string
    contactEmail: string
    doNotReply: string
    logo: {
      src: string
    }
    footerMessages: FooterMessage[]
  }
}

export {}
