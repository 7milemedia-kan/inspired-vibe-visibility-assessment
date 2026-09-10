/**
 * CRM hand-off seam.
 *
 * Nothing here talks to HubSpot yet, by decision — leads land in SQLite and
 * leave through the CSV export. This module exists so that when HubSpot is
 * turned on, exactly one file changes and nothing upstream has to move.
 *
 * The contract:
 *   - syncLead() is called after the lead row is committed, never before.
 *     A CRM outage must never cost us the lead.
 *   - It is fire-and-forget from the route's perspective. It resolves to a
 *     provider reference on success and null on failure, and it never throws.
 *   - Failures leave crm_status = "pending", so a future backfill job can
 *     pick up everything that never made it across.
 *
 * When HubSpot goes live, the implementation is a POST to
 * /crm/v3/objects/contacts with a private-app token from HUBSPOT_TOKEN, then
 * storage.markLeadSynced(lead.id, contactId). Field mapping is already
 * spelled out below so the shape doesn't have to be rediscovered.
 */
import type { Lead } from "@shared/schema";
import { storage } from "./storage";

export const CRM_ENABLED = false;

/** Our columns mapped to the HubSpot contact properties they belong in. */
export function toCrmProperties(lead: Lead): Record<string, string> {
  const [first, ...rest] = lead.fullName.trim().split(/\s+/);
  return {
    email: lead.email,
    firstname: first ?? "",
    lastname: rest.join(" "),
    company: lead.company,
    phone: lead.phone ?? "",
    website: lead.domain ?? "",
    // Custom properties to create on the HubSpot side before enabling.
    authority_score: lead.score === null ? "" : String(lead.score),
    authority_band: lead.band ?? "",
    authority_target_score: lead.targetScore === null ? "" : String(lead.targetScore),
    modeled_revenue_delta: lead.modeledDelta === null ? "" : String(lead.modeledDelta),
    lead_source_detail: "Authority Score — impact hand-off",
  };
}

export async function syncLead(lead: Lead): Promise<string | null> {
  if (!CRM_ENABLED) return null;
  try {
    // Replace with the live HubSpot call. Deliberately unimplemented.
    const ref = await Promise.resolve<string | null>(null);
    if (ref) await storage.markLeadSynced(lead.id, ref);
    return ref;
  } catch (err) {
    console.error("[crm] sync failed, lead retained as pending:", err);
    return null;
  }
}
