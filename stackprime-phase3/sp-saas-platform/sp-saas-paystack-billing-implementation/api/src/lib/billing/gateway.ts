/**
 * Provider adapter boundary. The billing domain persists provider-neutral
 * Payment/Subscription records; each gateway implements these transport operations.
 * Stripe intentionally has no active adapter until eligibility and credentials are confirmed.
 */
export type CheckoutRequest = {
  email: string;
  amountMinor: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string | null>;
  recurringPlanCode?: string;
};

export type CheckoutResult = {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
};

export interface PaymentGateway {
  readonly provider: 'PAYSTACK' | 'STRIPE';
  initializeCheckout(input: CheckoutRequest): Promise<CheckoutResult>;
  verifyPayment(reference: string): Promise<{
    status: string;
    reference: string;
    amount: number;
    currency: string;
    paidAt?: Date;
  }>;
}
