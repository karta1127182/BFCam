import {Platform} from 'react-native';
import Purchases, {type CustomerInfo, type PurchasesPackage} from 'react-native-purchases';
import {billingConfig} from '../config/billing';

export type PlanKind = 'monthly' | 'annual' | 'lifetime';
export type StorePlan = {kind: PlanKind; price: string; threeDayTrial: boolean; package: PurchasesPackage};
export type ProAccess = {active: boolean; trial: boolean; expiresAt: string | null; willRenew: boolean};
export const noProAccess: ProAccess = {active: false, trial: false, expiresAt: null, willRenew: false};

export function resolveProAccess(info: CustomerInfo, now = Date.now()): ProAccess {
  const entitlement = info.entitlements.active[billingConfig.entitlementId];
  const trusted = (value: string) => value === 'VERIFIED' || value === 'VERIFIED_ON_DEVICE';
  if (!entitlement?.isActive || !trusted(info.entitlements.verification) || !trusted(entitlement.verification)) return noProAccess;
  const expiration = entitlement.expirationDate;
  if (expiration !== null && (!Number.isFinite(Date.parse(expiration)) || Date.parse(expiration) <= now)) return noProAccess;
  return {active: true, trial: entitlement.periodType === 'TRIAL', expiresAt: expiration, willRenew: entitlement.willRenew};
}

export function hasThreeDayTrial(pkg: PurchasesPackage, platform: string, eligible: boolean): boolean {
  if (pkg.packageType === 'LIFETIME') return false;
  if (platform === 'android') {
    const phase = pkg.product.defaultOption?.freePhase;
    return !!phase && !pkg.product.defaultOption?.introPhase && phase.billingPeriod.iso8601 === 'P3D' && (phase.billingCycleCount ?? 1) === 1;
  }
  const intro = pkg.product.introPrice;
  return eligible && !!intro && intro.price === 0 && intro.period === 'P3D' && intro.cycles === 1;
}

export function billingConfigured() {
  const key = Platform.OS === 'android' ? billingConfig.androidPublicKey : Platform.OS === 'ios' ? billingConfig.iosPublicKey : '';
  const prefix = Platform.OS === 'android' ? 'goog_' : 'appl_';
  return key.startsWith(prefix) && key.length > prefix.length;
}

export function legalLinksConfigured() {
  return [billingConfig.termsUrl, billingConfig.privacyUrl].every(url => /^https:\/\/[^/\s]+/.test(url));
}

export async function initializeBilling() {
  if (!billingConfigured()) return false;
  if (!await Purchases.isConfigured()) Purchases.configure({
    apiKey: Platform.OS === 'android' ? billingConfig.androidPublicKey : billingConfig.iosPublicKey,
    entitlementVerificationMode: Purchases.ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL,
  });
  return true;
}

export async function getStorePlans(): Promise<StorePlan[]> {
  const offerings = await Purchases.getOfferings();
  const offering = offerings.all[billingConfig.offeringId];
  if (!offering) throw new Error('商店方案尚未設定完成');
  const packages = [offering.monthly, offering.annual, offering.lifetime].filter((pkg): pkg is PurchasesPackage => !!pkg)
    .filter(pkg => pkg.packageType === 'MONTHLY' ? pkg.product.subscriptionPeriod === 'P1M'
      : pkg.packageType === 'ANNUAL' ? pkg.product.subscriptionPeriod === 'P1Y'
        : pkg.packageType === 'LIFETIME' && pkg.product.subscriptionPeriod === null);
  const eligibility = Platform.OS === 'ios'
    ? await Purchases.checkTrialOrIntroductoryPriceEligibility(packages.filter(pkg => pkg.packageType !== 'LIFETIME').map(pkg => pkg.product.identifier)).catch(() => ({}))
    : {};
  return packages.map(pkg => ({
    kind: pkg.packageType === 'MONTHLY' ? 'monthly' : pkg.packageType === 'ANNUAL' ? 'annual' : 'lifetime',
    price: Platform.OS === 'android' ? pkg.product.defaultOption?.fullPricePhase?.price.formatted ?? pkg.product.priceString : pkg.product.priceString,
    threeDayTrial: hasThreeDayTrial(pkg, Platform.OS, (eligibility as Record<string, {status: number}>)[pkg.product.identifier]?.status === 2),
    package: pkg,
  }));
}

export {Purchases};
