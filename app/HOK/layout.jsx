"use client";

import AuthGate from "@/components/auth/AuthGate";
import { BRAND, ENTRANCE_IMAGE, LOGIN_BG_VIDEO, LOGIN_BG_AUDIO } from "@/components/hok/assets";
import * as hokTourPreload from "@/components/hok/tourAssetPreload";

export default function HOKLayout({ children }) {
  return (
    <AuthGate
      preloadTourAfterLogin
      tourPreload={hokTourPreload}
      entranceImage={ENTRANCE_IMAGE}
      showWhatsApp={false}
      loginBrand={{
        codePlaceholder: "e.g. HOK-VIP",
      }}
      welcomeProduct={BRAND.welcomeProduct}
      loginBackgroundVideo={LOGIN_BG_VIDEO}
      loginBackgroundAudio={LOGIN_BG_AUDIO}
      loginMinimal
      projectLogo={BRAND.logoUrl}
      projectLogoAlt={BRAND.fullName}
    >
      {children}
    </AuthGate>
  );
}
