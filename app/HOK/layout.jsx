"use client";

import AuthGate from "@/components/auth/AuthGate";
import { BRAND, ENTRANCE_IMAGE, LOGIN_BG_VIDEO } from "@/components/hok/assets";
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
      loginMinimal
      projectLogo={BRAND.logoUrl}
      projectLogoAlt={BRAND.fullName}
    >
      {children}
    </AuthGate>
  );
}
