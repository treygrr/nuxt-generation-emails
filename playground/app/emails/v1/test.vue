<script setup lang="ts">
defineOptions({
  name: 'TestNge',
})

interface OrderItem {
  name: string
  quantity: number
  formattedUnitPrice: string
  formattedTotal: string
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

const props = withDefaults(defineProps<{
  previewText?: string
  customerFirstName?: string
  orderNumber?: string
  orderDate?: string
  deliveryEstimate?: string
  storeName?: string
  supportEmail?: string
  orderUrl?: string
  shippingMethod?: string
  paymentMethod?: string
  formattedSubtotal?: string
  formattedShippingCost?: string
  formattedTax?: string
  formattedTotal?: string
  items?: OrderItem[]
  shippingAddress?: ShippingAddress
}>(), {
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
  formattedSubtotal: '$136.00',
  formattedShippingCost: '$8.99',
  formattedTax: '$14.82',
  formattedTotal: '$159.81',
  items: () => [
    { name: 'Alpine Trail Runner — Moss / Size 10', quantity: 1, formattedUnitPrice: '$89.00', formattedTotal: '$89.00' },
    { name: 'Merino Wool Hiking Socks (3-pack)', quantity: 1, formattedUnitPrice: '$24.00', formattedTotal: '$24.00' },
    { name: 'Quick-Dry Trail Cap — Slate', quantity: 1, formattedUnitPrice: '$23.00', formattedTotal: '$23.00' },
  ],
  shippingAddress: () => ({
    name: 'Avery Johnson',
    line1: '2241 Pine Street',
    line2: 'Apt 8C',
    city: 'Seattle',
    state: 'WA',
    postalCode: '98101',
    country: 'United States',
  }),
})

useNgeTemplate('v1/test', props)
</script>
