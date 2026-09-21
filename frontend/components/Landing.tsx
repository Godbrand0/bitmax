import { Hero } from "@/components/landing/Hero";
import { JourneyRail } from "@/components/landing/JourneyRail";
import { FundFlows } from "@/components/landing/FundFlows";
import { BoostExplainer } from "@/components/landing/BoostExplainer";
import { BorrowBand } from "@/components/landing/BorrowBand";
import { Faq } from "@/components/landing/Faq";
import { Waitlist } from "@/components/landing/Waitlist";
import { FinalCta } from "@/components/landing/FinalCta";

/**
 * Landing page composition - ordered as a narrative:
 * hook → the four-act journey → proof (where funds go) → the hard idea
 * (additive boosting) → liquidity → objections → mainnet signup → invitation.
 */
export function Landing() {
  return (
    <>
      <Hero />
      <JourneyRail />
      <FundFlows />
      <BoostExplainer />
      <BorrowBand />
      <Faq />
      <Waitlist />
      <FinalCta />
    </>
  );
}
