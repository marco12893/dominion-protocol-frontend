const BATTLEFIELD_STYLES = `
  @keyframes notification-slide {
    0% { transform: translateY(-20px); opacity: 0; }
    10% { transform: translateY(0); opacity: 1; }
    90% { transform: translateY(0); opacity: 1; }
    100% { transform: translateY(-10px); opacity: 0; }
  }

  .animate-notification {
    animation: notification-slide 4s ease-in-out forwards;
  }

  .scale-in-center {
    animation: scale-in-center 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
  }

  @keyframes scale-in-center {
    0% { transform: scale(0); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }

  @keyframes muzzle-flash {
    0% { opacity: 0; transform: scaleX(0.4); }
    100% { opacity: 1; transform: scaleX(1.5); }
  }

  @keyframes pulse-marker {
    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
  }

  @keyframes explosion {
    0% { transform: scale(0.1); opacity: 1; }
    100% { transform: scale(2.5); opacity: 0; }
  }

  @keyframes explosion-core {
    0% { transform: scale(0.1); opacity: 1; }
    50% { transform: scale(1.4); opacity: 0.5; }
    100% { transform: scale(3); opacity: 0; }
  }

  @keyframes explosion-ring {
    0% { transform: scale(0.2); opacity: 1; border-width: 4px; }
    100% { transform: scale(3.5); opacity: 0; border-width: 0px; }
  }

  @keyframes discrete-flash {
    0% { transform: scale(0.5); opacity: 1; }
    100% { transform: scale(1.5); opacity: 0; }
  }

  @keyframes spark {
    0% { transform: scale(0.2); opacity: 1; }
    100% { transform: scale(1.4); opacity: 0; }
  }

  @keyframes pulse-bold {
    0% { opacity: 0.5; transform: translate(-50%, -50%) scale(0.96); }
    50% { opacity: 1; transform: translate(-50%, -50%) scale(1.02); }
    100% { opacity: 0.5; transform: translate(-50%, -50%) scale(0.96); }
  }

  .animate-pulse-bold {
    animation: pulse-bold 1.2s ease-in-out infinite;
  }
`;

export default function BattlefieldStyles() {
  return <style dangerouslySetInnerHTML={{ __html: BATTLEFIELD_STYLES }} />;
}

