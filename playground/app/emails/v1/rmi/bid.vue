<script setup lang="ts">
defineOptions({ name: 'ExampleNge' })

const props = withDefaults(defineProps<{
  previewText?: string
  message?: string
  orderNumber?: string
  purchaseOrderNumber?: string
  customerAccountNumber?: string
  customerAccountName?: string
  requestersName?: string
  requestersEmail?: string
  orderInstructions?: string
  siteName?: string
  bannerData?: EmailFooterConfig
}>(), {
  previewText: 'R+MI bid created',
  message: 'Your request has been submitted and a bid has been created.',
  orderNumber: 'S123456789',
  purchaseOrderNumber: '542642-87563',
  customerAccountNumber: '1432393/1432404',
  customerAccountName: 'APP ENGINEERING TEST R+MI CSLS',
  requestersName: 'John Doe',
  requestersEmail: 'JohnJoe@rexel.com',
  orderInstructions: 'This is a note about the bid request. It can be as long as needed to provide details about the request.',
  siteName: 'Site Name',
  bannerData: () => ({
    bannerName: 'Rexel USA',
    siteUrl: 'https://rexelusa.com',
    siteName: 'Rexelusa.com',
    banner: 'rexel',
    contactUsUrl: 'https://rexelusa.com/contact-us',
    privacyUrl: 'https://sf.rexel-cdn.com/web/terms/Privacy_Policy.pdf',
    termsUrl: 'https://rexelusa.com/terms',
    mobileAppUrl: 'https://www.rexelusa.com/mobileapps',
    callMessage: 'Have a question - we\'re here to help! Rexel Team phone support at 1-888-739-3577 or visit our contact page',
    contactPhone: '1-888-739-3577',
    contactEmail: 'contact@rexel.com',
    doNotReply: 'This message was sent from a notification-only email address that does not accept incoming email. Please do not reply to this message.',
    logo: {
      src: 'https://rexel-cdn.com/assets/logos/rexel.png',
    },
    footerMessages: [
      {
        text: 'Prices are subject to change without notice. Prices quoted, unless otherwise specifically noted on this quotation, are subject to availability and must be accepted and released for immediate shipment within 48 hours.',
      },
      {
        html: '<span>Rexel\'s Standard Terms and Conditions of Sale are not included in this document, but are so here incorporated by reference within this quotation. A copy of Rexel\'s Standard Terms and Condition of Sale is available at <a style="color:lightBlue" target="_blank" href="https://rexelusa.com/terms">https://rexelusa.com/terms</a></span>',
      },
      {
        text: 'Full phone support at 1-888-739-3577',
      },
    ],
  }),
})

useNgeTemplate('v1/rmi/bid', props)
</script>
