<script setup lang="ts">
import { computed } from 'vue'
import {
  Body,
  Button,
  Container,
  Font,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@vue-email/components'

defineOptions({
  name: 'TestNge',
})

const props = withDefaults(defineProps<{
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
  shippingCost: 8.99,
  tax: 14.82,
})

const items = [
  { name: 'Alpine Trail Runner — Moss / Size 10', quantity: 1, unitPrice: 89.00 },
  { name: 'Merino Wool Hiking Socks (3-pack)', quantity: 1, unitPrice: 24.00 },
  { name: 'Quick-Dry Trail Cap — Slate', quantity: 1, unitPrice: 23.00 },
]

const shippingAddress = {
  name: 'Avery Johnson',
  line1: '2241 Pine Street',
  line2: 'Apt 8C',
  city: 'Seattle',
  state: 'WA',
  postalCode: '98101',
  country: 'United States',
}

const subtotal = computed(() => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0))
const total = computed(() => subtotal.value + props.shippingCost + props.tax)

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}
</script>

<template>
  <Tailwind>
    <Html lang="en">
      <Head />
      <Font
        font-family="DM Sans"
        :fallback-font-family="['Arial', 'Helvetica', 'sans-serif']"
        :web-font="{ url: 'https://fonts.gstatic.com/s/dmsans/v15/rP2Hp2ywxg089UriCZOIHTWEBlw.woff2', format: 'woff2' }"
      />
      <Preview>{{ props.previewText }}</Preview>
      <Body
        class="bg-slate-100 py-10 text-slate-900"
        style="font-family: 'DM Sans', Arial, Helvetica, sans-serif;"
      >
        <Container class="mx-auto w-full max-w-[640px] rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <Section>
            <Text class="m-0 text-xs font-semibold uppercase tracking-wide text-indigo-600">
              {{ props.storeName }}
            </Text>
            <Heading
              as="h1"
              class="mb-2 mt-4 text-2xl font-semibold text-slate-900"
            >
              Your order is confirmed 🎉
            </Heading>
            <Text class="m-0 text-base leading-7 text-slate-600">
              Hi {{ props.customerFirstName }}, thanks for your purchase. We’re getting your order ready to ship.
            </Text>
          </Section>

          <Section class="mt-6 rounded-lg bg-slate-50 p-5">
            <Text class="m-0 text-sm text-slate-600">
              Order #<span class="font-semibold text-slate-900">{{ props.orderNumber }}</span>
            </Text>
            <Text class="m-0 mt-2 text-sm text-slate-600">
              Placed on {{ props.orderDate }}
            </Text>
            <Text class="m-0 mt-2 text-sm text-slate-600">
              Estimated delivery: <span class="font-semibold text-slate-900">{{ props.deliveryEstimate }}</span>
            </Text>
          </Section>

          <Section class="mt-8">
            <Heading
              as="h2"
              class="mb-3 mt-0 text-lg font-semibold text-slate-900"
            >
              Items in this order
            </Heading>

            <Section
              v-for="(item, index) in items"
              :key="`${item.name}-${index}`"
              class="rounded-md border border-slate-200 p-4"
              :class="index === 0 ? '' : 'mt-3'"
            >
              <Text class="m-0 text-sm font-medium text-slate-900">
                {{ item.name }}
              </Text>
              <Text class="m-0 mt-1 text-sm text-slate-600">
                Qty {{ item.quantity }} × {{ formatCurrency(item.unitPrice) }}
              </Text>
              <Text class="m-0 mt-2 text-sm font-semibold text-slate-900">
                {{ formatCurrency(item.quantity * item.unitPrice) }}
              </Text>
            </Section>
          </Section>

          <Hr class="my-8 border-slate-200" />

          <Section>
            <Heading
              as="h2"
              class="mb-3 mt-0 text-lg font-semibold text-slate-900"
            >
              Order summary
            </Heading>
            <Text class="m-0 flex justify-between text-sm text-slate-700">
              <span>Subtotal</span>
              <span>{{ formatCurrency(subtotal) }}</span>
            </Text>
            <Text class="m-0 mt-2 flex justify-between text-sm text-slate-700">
              <span>Shipping</span>
              <span>{{ formatCurrency(props.shippingCost) }}</span>
            </Text>
            <Text class="m-0 mt-2 flex justify-between text-sm text-slate-700">
              <span>Tax</span>
              <span>{{ formatCurrency(props.tax) }}</span>
            </Text>
            <Text class="m-0 mt-3 flex justify-between text-base font-semibold text-slate-900">
              <span>Total</span>
              <span>{{ formatCurrency(total) }}</span>
            </Text>
          </Section>

          <Section class="mt-8 rounded-lg border border-slate-200 p-5">
            <Heading
              as="h3"
              class="mb-2 mt-0 text-base font-semibold text-slate-900"
            >
              Shipping to
            </Heading>
            <Text class="m-0 text-sm leading-6 text-slate-700">
              {{ shippingAddress.name }}<br>
              {{ shippingAddress.line1 }}<br>
              <span v-if="shippingAddress.line2">{{ shippingAddress.line2 }}<br></span>
              {{ shippingAddress.city }}, {{ shippingAddress.state }} {{ shippingAddress.postalCode }}<br>
              {{ shippingAddress.country }}
            </Text>
            <Text class="m-0 mt-3 text-sm text-slate-700">
              Shipping method: {{ props.shippingMethod }}
            </Text>
            <Text class="m-0 mt-1 text-sm text-slate-700">
              Payment method: {{ props.paymentMethod }}
            </Text>
          </Section>

          <Section class="mt-8 text-center">
            <Button
              :href="props.orderUrl"
              class="rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white no-underline"
            >
              View order details
            </Button>
            <Text class="m-0 mt-4 text-sm text-slate-600">
              Need help? Contact us at
              <Link
                :href="`mailto:${props.supportEmail}`"
                class="text-indigo-600 no-underline"
              >
                {{ props.supportEmail }}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  </Tailwind>
</template>
