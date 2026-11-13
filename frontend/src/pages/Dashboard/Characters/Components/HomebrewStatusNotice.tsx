import React from 'react';
import '../../../../styles/homebrew.css';

export type HomebrewStatus = 'pending' | 'approved' | 'rejected' | null | undefined;

const CHIP_LABEL: Record<string, string> = {
  pending: 'Homebrew · awaiting DM',
  approved: 'Homebrew · DM approved',
  rejected: 'Homebrew · not approved',
};

export const HomebrewStatusChip = ({ status }: { status: HomebrewStatus }) =>
  status ? <span className={`homebrew-status homebrew-status--${status}`}>{CHIP_LABEL[status]}</span> : null;

interface Props {
  status: HomebrewStatus;
  note?: string | null;
  homebrew: { kind: 'race' | 'class'; name: string }[];
  isOwner: boolean;
  campaignName?: string;
  unsavedCampaignChange?: boolean;
}

// Explains on the character sheet why a homebrew character can't join the
// table yet, or what the DM said when they turned it down.
const HomebrewStatusNotice = ({ status, note, homebrew, isOwner, campaignName, unsavedCampaignChange }: Props) => {
  if (!status || status === 'approved' || unsavedCampaignChange) return null;

  const parts = homebrew.map((h) => `${h.name} (${h.kind})`).join(', ') || 'homebrew content';
  const where = campaignName ? ` for ${campaignName}` : '';

  if (status === 'pending') {
    return (
      <div className="homebrew-notice homebrew-notice--pending mb-3" role="status">
        This character uses {parts}. {isOwner ? 'Your DM needs to approve it' : 'The DM needs to approve it'}{where} before it can join the table.
      </div>
    );
  }

  return (
    <div className="homebrew-notice homebrew-notice--rejected mb-3" role="status">
      The DM didn't approve {parts}{where}.
      {note && <> Their note: <em>“{note}”</em></>}
      {isOwner && ' Changing the homebrew sends it back for review.'}
    </div>
  );
};

export default HomebrewStatusNotice;
