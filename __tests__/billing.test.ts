import {billingConfig} from '../src/config/billing';
import {billingConfigured, getStorePlans, hasThreeDayTrial, initializeBilling, legalLinksConfigured, Purchases, resolveProAccess} from '../src/services/billing';
import type {CustomerInfo, PurchasesPackage} from 'react-native-purchases';

jest.mock('react-native', () => ({Platform: {OS: 'android'}}));

jest.mock('react-native-purchases', () => ({__esModule: true, default: {
  isConfigured: jest.fn(), configure: jest.fn(), getOfferings: jest.fn(),
  ENTITLEMENT_VERIFICATION_MODE: {INFORMATIONAL: 'INFORMATIONAL'},
}}));

function customer(overrides: Record<string, unknown> = {}, verification = 'VERIFIED'): CustomerInfo {
  return {entitlements: {verification, active: {bfcam_pro: {
    isActive: true, verification: 'VERIFIED', expirationDate: '2030-01-01T00:00:00Z',
    periodType: 'TRIAL', willRenew: true, ...overrides,
  }}}} as unknown as CustomerInfo;
}
const pkg = (overrides: Record<string, unknown> = {}) => ({packageType: 'MONTHLY', product: {
  identifier: 'pro-monthly', subscriptionPeriod: 'P1M', priceString: '$90', introPrice: {price: 0, period: 'P3D', cycles: 1},
  defaultOption: {freePhase: {billingPeriod: {iso8601: 'P3D'}, billingCycleCount: 1}},
}, ...overrides}) as unknown as PurchasesPackage;

afterEach(() => {billingConfig.androidPublicKey = ''; billingConfig.iosPublicKey = ''; billingConfig.termsUrl = ''; billingConfig.privacyUrl = ''; jest.clearAllMocks();});

test('missing store configuration cannot start billing or fake entitlement', async () => {
  expect(billingConfigured()).toBe(false);
  expect(await initializeBilling()).toBe(false);
  expect(Purchases.configure).not.toHaveBeenCalled();
  expect(resolveProAccess({entitlements: {active: {}}} as CustomerInfo).active).toBe(false);
});

test('requires verified, active and unexpired access; cancellation keeps access through expiry', () => {
  expect(resolveProAccess(customer()).trial).toBe(true);
  expect(resolveProAccess(customer({willRenew: false}))).toMatchObject({active: true, willRenew: false});
  expect(resolveProAccess(customer({expirationDate: '2020-01-01'})).active).toBe(false);
  expect(resolveProAccess(customer({expirationDate: 'invalid'})).active).toBe(false);
  expect(resolveProAccess(customer({isActive: false})).active).toBe(false);
  expect(resolveProAccess(customer({}, 'FAILED')).active).toBe(false);
  expect(resolveProAccess(customer({verification: 'NOT_REQUESTED'})).active).toBe(false);
  expect(resolveProAccess(customer({verification: 'FAILED'})).active).toBe(false);
  expect(resolveProAccess(customer({expirationDate: null, periodType: 'NORMAL'}))).toMatchObject({active: true, trial: false, expiresAt: null});
});

test('only promises three days for an eligible three-day store offer', () => {
  expect(hasThreeDayTrial(pkg(), 'ios', true)).toBe(true);
  expect(hasThreeDayTrial(pkg(), 'ios', false)).toBe(false);
  expect(hasThreeDayTrial(pkg({packageType: 'LIFETIME'}), 'ios', true)).toBe(false);
  expect(hasThreeDayTrial(pkg(), 'android', false)).toBe(true);
  expect(hasThreeDayTrial(pkg({product: {defaultOption: null}}), 'android', false)).toBe(false);
  expect(hasThreeDayTrial(pkg({product: {introPrice: {price: 0, period: 'P7D', cycles: 1}}}), 'ios', true)).toBe(false);
});

test('requires public legal pages before enabling purchases', () => {
  expect(legalLinksConfigured()).toBe(false);
  billingConfig.termsUrl = 'https://example.com/terms';
  billingConfig.privacyUrl = 'https://example.com/privacy';
  expect(legalLinksConfigured()).toBe(true);
});

test('missing offering is an error instead of showing fabricated products', async () => {
  (Purchases.getOfferings as jest.Mock).mockResolvedValue({all: {}});
  await expect(getStorePlans()).rejects.toThrow('商店方案尚未設定完成');
});

test('uses store prices and filters wrongly mapped subscription periods', async () => {
  (Purchases.getOfferings as jest.Mock).mockResolvedValue({all: {bfcam_pro: {
    monthly: pkg(),
    annual: pkg({packageType: 'ANNUAL'}), // Monthly product incorrectly assigned to Annual.
    lifetime: pkg({packageType: 'LIFETIME', product: {subscriptionPeriod: null, priceString: '$390'}}),
  }}});
  const plans = await getStorePlans();
  expect(plans.map(plan => [plan.kind, plan.price, plan.threeDayTrial])).toEqual([
    ['monthly', '$90', true], ['lifetime', '$390', false],
  ]);
});

test('configures the SDK with trusted entitlement verification and only the public platform key', async () => {
  billingConfig.androidPublicKey = 'goog_public-test-fixture';
  (Purchases.isConfigured as jest.Mock).mockResolvedValue(false);
  expect(await initializeBilling()).toBe(true);
  expect(Purchases.configure).toHaveBeenCalledWith({apiKey: 'goog_public-test-fixture', entitlementVerificationMode: 'INFORMATIONAL'});
});
