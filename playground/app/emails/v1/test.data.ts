import { reactive } from 'vue'

interface OrderItem {
  name: string
  quantity: number
  unitPrice: number
}

interface ShippingAddress {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface TestData extends Record<string, unknown> {
  previewText: string
  customerFirstName: string
  orderNumber: string
  orderDate: string
  deliveryEstimate: string
  storeName: string
  supportEmail: string
  orderUrl: string
  shippingMethod: string
  paymentMethod: string
  shippingCost: number
  tax: number
  items: OrderItem[]
  shippingAddress: ShippingAddress
}

export const testData = reactive<TestData>({
  previewText: 'Your order has been confirmed and is being prepared for shipment.',
  customerFirstName: 'Avery',
  orderNumber: 'NGE-904381',
  orderDate: 'February 13, 2026',
  deliveryEstimate: 'February 18, 2026',
  storeName: 'Northwind Outfitters',
  supportEmail: 'support@northwindoutfitters.com',
  orderUrl: 'https://example.com/orders/NGE-904381',
  shippingMethod: 'Standard (3-5 business days)',
  paymentMethod: 'Visa •••• 4242',
  shippingCost: 8.99,
  tax: 14.82,
  items: [
    {
      name: 'Evergreen Insulated Bottle - 20oz',
      quantity: 1,
      unitPrice: 32,
    },
    {
      name: 'Trail Running Socks (3-Pack)',
      quantity: 2,
      unitPrice: 12.5,
    },
    {
      name: 'Summit Daypack - Slate',
      quantity: 1,
      unitPrice: 79,
    },
  ],
  shippingAddress: {
    name: 'Avery Johnson',
    line1: '2241 Pine Street',
    line2: 'Apt 8C',
    city: 'Seattle',
    state: 'WA',
    postalCode: '98101',
    country: 'United States',
  },
})

export function updateTestData(data: Partial<TestData>) {
  Object.assign(testData, data)
}
