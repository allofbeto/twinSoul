interface CurtainProps {
    sessionTitle: string;
    campaignName?: string;
  }

  export default function Curtain({ sessionTitle, campaignName }: CurtainProps) {
    return (
      <header className="theatre__curtain">
        <div className="theatre__curtain-left" />

        <div className="theatre__title">
          <span className="theatre__title-main">{sessionTitle}</span>
          {campaignName && <span className="theatre__title-sub">{campaignName}</span>}
        </div>

        <div className="theatre__curtain-right" />
      </header>
    );
  }
