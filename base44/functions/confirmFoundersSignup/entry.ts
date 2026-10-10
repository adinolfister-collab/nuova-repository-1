import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  CAMPAIGN, assignRanks, grantFieldsForRank,
} from '../../shared/foundersCampaign.ts';

// Confirms the current user's Founder signup (called after they post a
// message in the community). Finalizes the ranking across all confirmed
// signups and writes the Premium grant (lifetime / three_months) onto the
// user profile. Service role is used for the rank recompute and the grant,
// which must not be user-settable.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const all = await base44.asServiceRole.entities.CampaignSignup.list('-rank', 500) as any[];
    const mine = all.filter((s) => s.campaign === CAMPAIGN && s.created_by_id === user.id);
    if (mine.length === 0) {
      return Response.json({ confirmed: false, reason: 'no_signup' });
    }
    const signup = mine[0];
    if (signup.confirmed) {
      return Response.json({ confirmed: true, rank: signup.rank, slot_type: signup.slot_type, already: true });
    }

    // Mark confirmed with the first-message timestamp.
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.CampaignSignup.update(signup.id, {
      confirmed: true,
      first_message_date: now,
    });

    // Recompute ranks across all confirmed signups (ordered by first_message_date).
    const confirmed = (all as any[])
      .filter((s) => s.campaign === CAMPAIGN && s.confirmed)
      .map((s) => s.id === signup.id ? { ...s, confirmed: true, first_message_date: now } : s);
    const ranked = assignRanks(confirmed as any);
    if (ranked.length > 0) {
      await base44.asServiceRole.entities.CampaignSignup.bulkUpdate(
        ranked.map((r) => ({ id: r.id, rank: r.rank, slot_type: r.slot_type }))
      );
    }

    const mineRanked = ranked.find((r) => r.id === signup.id);
    const rank = mineRanked?.rank || 1;
    const slotType = mineRanked?.slot_type || 'lifetime';
    await base44.asServiceRole.entities.User.update(user.id, grantFieldsForRank(rank) as any);

    return Response.json({ confirmed: true, rank, slot_type: slotType });
  } catch (error) {
    console.error('confirmFoundersSignup', error);
    return Response.json({ error: 'Impossibile confermare il posto' }, { status: 502 });
  }
}